import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { debounce } from '@/lib/debounce'
import { formatNetworkError } from '@/lib/network-error'
import { isApprovedToday, isOverdueReturn, isStudentCurrentlyOut } from '@/lib/warden'
import { supabase } from '@/lib/supabase'
import type {
  ExtensionRequest,
  GateLog,
  OutpassRequest,
  OutpassWithStudent,
} from '@/lib/types'

export interface WardenStats {
  pendingReview: number
  studentsOut: number
  approvedToday: number
  overdueReturns: number
}

interface WardenData {
  passes: OutpassWithStudent[]
  gateLogs: GateLog[]
  extensions: ExtensionRequest[]
  stats: WardenStats
  pendingCount: number
  pendingExtensionsCount: number
  loading: boolean
  refreshing: boolean
  error: string | null
  refetch: () => Promise<void>
}

const REALTIME_DEBOUNCE_MS = 600
/** Bound historical load — pending/is_overdue always included regardless of age. */
const ACTIVE_LOOKBACK_DAYS = 120
const CLOSED_LOOKBACK_DAYS = 45
const GATE_LOG_CHUNK = 80

const PASS_SELECT = `
  id,
  student_id,
  pass_type,
  destination,
  reason,
  departure_at,
  return_by,
  status,
  warden_remark,
  approved_by,
  approved_at,
  is_overdue,
  qr_code_data,
  students (
    reg_number,
    room_number,
    hostel_block,
    profiles ( full_name )
  )
`

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function computeStats(passes: OutpassRequest[], gateLogs: GateLog[]): WardenStats {
  return {
    pendingReview: passes.filter((p) => p.status === 'pending').length,
    studentsOut: passes.filter((p) => isStudentCurrentlyOut(p, gateLogs)).length,
    approvedToday: passes.filter((p) => isApprovedToday(p.approved_at)).length,
    overdueReturns: passes.filter((p) => isOverdueReturn(p, gateLogs)).length,
  }
}

function mergePasses(chunks: OutpassWithStudent[]): OutpassWithStudent[] {
  const byId = new Map<string, OutpassWithStudent>()
  for (const pass of chunks) byId.set(pass.id, pass)
  return [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

async function fetchGateLogsForPassIds(passIds: string[]): Promise<GateLog[]> {
  if (passIds.length === 0) return []

  const logs: GateLog[] = []
  for (let i = 0; i < passIds.length; i += GATE_LOG_CHUNK) {
    const chunk = passIds.slice(i, i + GATE_LOG_CHUNK)
    const { data, error } = await supabase
      .from('gate_logs')
      .select('id, outpass_id, scanned_by, event_type, scanned_at')
      .in('outpass_id', chunk)

    if (error) {
      console.warn('warden gate_logs soft-failed:', error.message)
      break
    }
    logs.push(...((data ?? []) as GateLog[]))
  }
  return logs
}

export function useWardenData(): WardenData {
  const [passes, setPasses] = useState<OutpassWithStudent[]>([])
  const [gateLogs, setGateLogs] = useState<GateLog[]>([])
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasLoadedRef = useRef(false)
  const inFlightRef = useRef<Promise<void> | null>(null)
  const passIdsRef = useRef<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    if (inFlightRef.current) {
      await inFlightRef.current
      return
    }

    const run = (async () => {
      setError(null)
      if (hasLoadedRef.current) setRefreshing(true)

      try {
        const activeCutoff = daysAgoIso(ACTIVE_LOOKBACK_DAYS)
        const closedCutoff = daysAgoIso(CLOSED_LOOKBACK_DAYS)

        const [pendingResult, activeResult, overdueResult, closedResult, extensionsResult] =
          await Promise.all([
            supabase
              .from('outpass_requests')
              .select(PASS_SELECT)
              .eq('status', 'pending')
              .order('created_at', { ascending: false }),
            supabase
              .from('outpass_requests')
              .select(PASS_SELECT)
              .in('status', ['approved', 'extended'])
              .gte('created_at', activeCutoff)
              .order('created_at', { ascending: false }),
            supabase
              .from('outpass_requests')
              .select(PASS_SELECT)
              .in('status', ['approved', 'extended'])
              .eq('is_overdue', true)
              .order('created_at', { ascending: false })
              .limit(300),
            supabase
              .from('outpass_requests')
              .select(PASS_SELECT)
              .in('status', ['rejected', 'cancelled'])
              .gte('created_at', closedCutoff)
              .order('created_at', { ascending: false })
              .limit(200),
            supabase
              .from('extension_requests')
              .select('id, outpass_id, new_return_time, reason, status, created_at')
              .or(`status.eq.pending,created_at.gte.${closedCutoff}`)
              .order('created_at', { ascending: false })
              .limit(400),
          ])

        const firstError =
          pendingResult.error
          ?? activeResult.error
          ?? overdueResult.error
          ?? closedResult.error
          ?? extensionsResult.error

        if (firstError) {
          setError(formatNetworkError(firstError.message))
          return
        }

        const allPasses = mergePasses([
          ...((pendingResult.data ?? []) as unknown as OutpassWithStudent[]),
          ...((activeResult.data ?? []) as unknown as OutpassWithStudent[]),
          ...((overdueResult.data ?? []) as unknown as OutpassWithStudent[]),
          ...((closedResult.data ?? []) as unknown as OutpassWithStudent[]),
        ])

        setPasses(allPasses)
        setExtensions((extensionsResult.data ?? []) as ExtensionRequest[])
        passIdsRef.current = new Set(allPasses.map((p) => p.id))

        const logs = await fetchGateLogsForPassIds(allPasses.map((p) => p.id))
        setGateLogs(logs)
      } catch (err) {
        setError(formatNetworkError(err, 'Failed to load warden data.'))
      } finally {
        hasLoadedRef.current = true
        setHasLoaded(true)
        setRefreshing(false)
      }
    })()

    inFlightRef.current = run
    try {
      await run
    } finally {
      inFlightRef.current = null
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    const scheduleRefresh = debounce(() => {
      void fetchData()
    }, REALTIME_DEBOUNCE_MS)

    const channel = supabase
      .channel('warden-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outpass_requests' },
        () => scheduleRefresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gate_logs' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { outpass_id?: string } | null
          if (row?.outpass_id && !passIdsRef.current.has(row.outpass_id)) return
          scheduleRefresh()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'extension_requests' },
        () => scheduleRefresh(),
      )
      .subscribe()

    return () => {
      scheduleRefresh.cancel()
      void supabase.removeChannel(channel)
    }
  }, [fetchData])

  const stats = useMemo(() => computeStats(passes, gateLogs), [passes, gateLogs])
  const pendingCount = stats.pendingReview
  const pendingExtensionsCount = useMemo(
    () => extensions.filter((e) => e.status === 'pending').length,
    [extensions],
  )

  return useMemo(
    () => ({
      passes,
      gateLogs,
      extensions,
      stats,
      pendingCount,
      pendingExtensionsCount,
      loading: !hasLoaded,
      refreshing,
      error,
      refetch: fetchData,
    }),
    [
      passes,
      gateLogs,
      extensions,
      stats,
      pendingCount,
      pendingExtensionsCount,
      hasLoaded,
      refreshing,
      error,
      fetchData,
    ],
  )
}
