import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { debounce } from '@/lib/debounce'
import { formatNetworkError } from '@/lib/network-error'
import { normalizeHostelBlock } from '@/lib/block-display'
import { readSessionCache, writeSessionCache } from '@/lib/query-cache'
import { isApprovedToday, isOverdueReturn, isStudentCurrentlyOut } from '@/lib/warden'
import { passMatchesWardenScope, type WardenScope } from '@/lib/warden-scope'
import { useWardenScope } from '@/hooks/warden/useWardenScope'
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
  scopeError: string | null
  scope: ReturnType<typeof useWardenScope>['scope']
  setAvailability: ReturnType<typeof useWardenScope>['setAvailability']
  refetchScope: ReturnType<typeof useWardenScope>['refetch']
  refetch: () => Promise<void>
}

const REALTIME_DEBOUNCE_MS = 600
const ACTIVE_LOOKBACK_DAYS = 120
const CLOSED_LOOKBACK_DAYS = 45
const GATE_LOG_CHUNK = 80
const PENDING_CAP = 200
const ACTIVE_CAP = 250
const SOFT_POLL_MS = 30_000
const SESSION_CACHE_MAX_AGE_MS = 120_000

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
  created_at,
  students!inner (
    reg_number,
    room_number,
    hostel_block,
    gender,
    parent_phone,
    profiles ( full_name, phone, avatar_url )
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

function scopeSessionKey(scope: WardenScope): string {
  const blocks =
    scope.tier === 'superior'
      ? scope.escalatedBlocks.join(',')
      : (scope.block ?? '')
  return `warden-home:${scope.tier}:${scope.gender}:${blocks}`
}

/** Apply block/gender filters in PostgREST so we don't download campus-wide then filter in JS. */
function applyScopeFilters<T extends { eq: Function; in: Function }>(query: T, scope: WardenScope): T {
  let next = query.eq('students.gender', scope.gender) as T

  if (scope.tier === 'rt' && scope.block) {
    next = next.eq('students.hostel_block', normalizeHostelBlock(scope.block)) as T
  } else if (scope.tier === 'superior') {
    const blocks = scope.escalatedBlocks.map(normalizeHostelBlock).filter(Boolean)
    if (blocks.length === 0) {
      // No escalated blocks — force empty result via impossible filter
      next = next.eq('students.hostel_block', '__none__') as T
    } else {
      next = next.in('students.hostel_block', blocks) as T
    }
  }

  return next
}

async function fetchGateLogsForPassIds(passIds: string[]): Promise<GateLog[]> {
  if (passIds.length === 0) return []

  const logs: GateLog[] = []
  // Fetch first chunks in parallel for faster home paint; remaining sequential.
  const firstBatch = passIds.slice(0, GATE_LOG_CHUNK * 2)
  const rest = passIds.slice(GATE_LOG_CHUNK * 2)

  const firstChunks: string[][] = []
  for (let i = 0; i < firstBatch.length; i += GATE_LOG_CHUNK) {
    firstChunks.push(firstBatch.slice(i, i + GATE_LOG_CHUNK))
  }

  const firstResults = await Promise.all(
    firstChunks.map((chunk) =>
      supabase
        .from('gate_logs')
        .select('id, outpass_id, scanned_by, event_type, scanned_at')
        .in('outpass_id', chunk),
    ),
  )

  for (const result of firstResults) {
    if (result.error) {
      console.warn('warden gate_logs soft-failed:', result.error.message)
      return logs
    }
    logs.push(...((result.data ?? []) as GateLog[]))
  }

  for (let i = 0; i < rest.length; i += GATE_LOG_CHUNK) {
    const chunk = rest.slice(i, i + GATE_LOG_CHUNK)
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

interface WardenSnapshot {
  passes: OutpassWithStudent[]
  gateLogs: GateLog[]
  extensions: ExtensionRequest[]
}

export function useWardenData(): WardenData {
  const {
    scope,
    loading: scopeLoading,
    error: scopeError,
    setAvailability,
    refetch: refetchScope,
  } = useWardenScope()

  const cached = scope
    ? readSessionCache<WardenSnapshot>(scopeSessionKey(scope), SESSION_CACHE_MAX_AGE_MS)
    : null

  const [passes, setPasses] = useState<OutpassWithStudent[]>(cached?.passes ?? [])
  const [gateLogs, setGateLogs] = useState<GateLog[]>(cached?.gateLogs ?? [])
  const [extensions, setExtensions] = useState<ExtensionRequest[]>(cached?.extensions ?? [])
  const [hasLoaded, setHasLoaded] = useState(Boolean(cached))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasLoadedRef = useRef(Boolean(cached))
  const inFlightRef = useRef<Promise<void> | null>(null)
  const passIdsRef = useRef<Set<string>>(new Set(cached?.passes.map((p) => p.id) ?? []))
  const fetchGenerationRef = useRef(0)

  const fetchData = useCallback(async () => {
    if (!scope) return

    if (inFlightRef.current) {
      await inFlightRef.current
      return
    }

    const generation = ++fetchGenerationRef.current

    const run = (async () => {
      setError(null)
      if (hasLoadedRef.current) setRefreshing(true)

      try {
        const activeCutoff = daysAgoIso(ACTIVE_LOOKBACK_DAYS)
        const closedCutoff = daysAgoIso(CLOSED_LOOKBACK_DAYS)

        const pendingQ = applyScopeFilters(
          supabase
            .from('outpass_requests')
            .select(PASS_SELECT)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(PENDING_CAP),
          scope,
        )
        const activeQ = applyScopeFilters(
          supabase
            .from('outpass_requests')
            .select(PASS_SELECT)
            .in('status', ['approved', 'extended'])
            .gte('created_at', activeCutoff)
            .order('created_at', { ascending: false })
            .limit(ACTIVE_CAP),
          scope,
        )
        const overdueQ = applyScopeFilters(
          supabase
            .from('outpass_requests')
            .select(PASS_SELECT)
            .in('status', ['approved', 'extended'])
            .eq('is_overdue', true)
            .order('created_at', { ascending: false })
            .limit(300),
          scope,
        )
        const closedQ = applyScopeFilters(
          supabase
            .from('outpass_requests')
            .select(PASS_SELECT)
            .in('status', ['rejected', 'cancelled'])
            .gte('created_at', closedCutoff)
            .order('created_at', { ascending: false })
            .limit(200),
          scope,
        )

        const [pendingResult, activeResult, overdueResult, closedResult, extensionsResult] =
          await Promise.all([
            pendingQ,
            activeQ,
            overdueQ,
            closedQ,
            supabase
              .from('extension_requests')
              .select('id, outpass_id, new_return_time, reason, status, created_at')
              .or(`status.eq.pending,created_at.gte.${closedCutoff}`)
              .order('created_at', { ascending: false })
              .limit(400),
          ])

        if (generation !== fetchGenerationRef.current) return

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

        // Defensive client filter (handles block naming variants)
        const allPasses = mergePasses([
          ...((pendingResult.data ?? []) as unknown as OutpassWithStudent[]),
          ...((activeResult.data ?? []) as unknown as OutpassWithStudent[]),
          ...((overdueResult.data ?? []) as unknown as OutpassWithStudent[]),
          ...((closedResult.data ?? []) as unknown as OutpassWithStudent[]),
        ]).filter((pass) => passMatchesWardenScope(pass, scope))

        setPasses(allPasses)
        const passIdSet = new Set(allPasses.map((p) => p.id))
        const nextExtensions = ((extensionsResult.data ?? []) as ExtensionRequest[]).filter((ext) =>
          passIdSet.has(ext.outpass_id),
        )
        setExtensions(nextExtensions)
        passIdsRef.current = passIdSet

        // Prioritize gate logs for pending + overdue + currently-relevant passes first
        const priorityIds = allPasses
          .filter((p) => p.status === 'pending' || p.status === 'approved' || p.status === 'extended')
          .map((p) => p.id)
        const otherIds = allPasses.map((p) => p.id).filter((id) => !priorityIds.includes(id))

        const priorityLogs = await fetchGateLogsForPassIds(priorityIds)
        if (generation !== fetchGenerationRef.current) return
        setGateLogs(priorityLogs)
        writeSessionCache(scopeSessionKey(scope), {
          passes: allPasses,
          gateLogs: priorityLogs,
          extensions: nextExtensions,
        })

        if (otherIds.length > 0) {
          void fetchGateLogsForPassIds(otherIds).then((more) => {
            if (generation !== fetchGenerationRef.current) return
            setGateLogs((prev) => {
              const merged = [...prev, ...more]
              writeSessionCache(scopeSessionKey(scope), {
                passes: allPasses,
                gateLogs: merged,
                extensions: nextExtensions,
              })
              return merged
            })
          })
        }
      } catch (err) {
        if (generation !== fetchGenerationRef.current) return
        setError(formatNetworkError(err, 'Failed to load warden data.'))
      } finally {
        if (generation !== fetchGenerationRef.current) return
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
  }, [scope])

  useEffect(() => {
    if (scopeLoading) return
    if (!scope) {
      setPasses([])
      setGateLogs([])
      setExtensions([])
      passIdsRef.current = new Set()
      hasLoadedRef.current = true
      setHasLoaded(true)
      return
    }
    void fetchData()
  }, [scope, scopeLoading, fetchData])

  // Realtime: outpass only (filtered client-side by refetch). Soft-poll replaces gate_logs fan-out.
  useEffect(() => {
    if (!scope) return

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
        { event: '*', schema: 'public', table: 'extension_requests' },
        () => scheduleRefresh(),
      )
      .subscribe()

    const softPoll = window.setInterval(() => {
      void fetchData()
    }, SOFT_POLL_MS)

    return () => {
      scheduleRefresh.cancel()
      window.clearInterval(softPoll)
      void supabase.removeChannel(channel)
    }
  }, [fetchData, scope])

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
      loading: scopeLoading || !hasLoaded,
      refreshing,
      error,
      scopeError,
      scope,
      setAvailability,
      refetchScope,
      refetch: fetchData,
    }),
    [
      passes,
      gateLogs,
      extensions,
      stats,
      pendingCount,
      pendingExtensionsCount,
      scopeLoading,
      hasLoaded,
      refreshing,
      error,
      scopeError,
      scope,
      setAvailability,
      refetchScope,
      fetchData,
    ],
  )
}
