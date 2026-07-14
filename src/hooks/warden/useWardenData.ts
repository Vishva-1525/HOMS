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

function computeStats(passes: OutpassRequest[], gateLogs: GateLog[]): WardenStats {
  return {
    pendingReview: passes.filter((p) => p.status === 'pending').length,
    studentsOut: passes.filter((p) => isStudentCurrentlyOut(p, gateLogs)).length,
    approvedToday: passes.filter((p) => isApprovedToday(p.approved_at)).length,
    overdueReturns: passes.filter((p) => isOverdueReturn(p, gateLogs)).length,
  }
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

  const fetchData = useCallback(async () => {
    if (inFlightRef.current) {
      await inFlightRef.current
      return
    }

    const run = (async () => {
      setError(null)
      if (hasLoadedRef.current) setRefreshing(true)

      try {
        const [passesResult, extensionsResult] = await Promise.all([
          supabase
            .from('outpass_requests')
            .select(`
              *,
              students (
                reg_number,
                room_number,
                hostel_block,
                profiles ( full_name )
              )
            `)
            .order('created_at', { ascending: false }),
          supabase.from('extension_requests').select('*').order('created_at', { ascending: false }),
        ])

        if (passesResult.error) {
          setError(formatNetworkError(passesResult.error.message))
          return
        }

        if (extensionsResult.error) {
          setError(formatNetworkError(extensionsResult.error.message))
          return
        }

        const allPasses = (passesResult.data ?? []) as OutpassWithStudent[]
        setPasses(allPasses)
        setExtensions((extensionsResult.data ?? []) as ExtensionRequest[])

        const passIds = allPasses.map((p) => p.id)

        if (passIds.length > 0) {
          const { data: logs, error: logsError } = await supabase
            .from('gate_logs')
            .select('*')
            .in('outpass_id', passIds)

          if (logsError) {
            console.warn('warden gate_logs soft-failed:', logsError.message)
          } else {
            setGateLogs((logs ?? []) as GateLog[])
          }
        } else {
          setGateLogs([])
        }
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
        () => scheduleRefresh(),
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

  const stats = useMemo(
    () => computeStats(passes, gateLogs),
    [passes, gateLogs],
  )

  const pendingCount = stats.pendingReview
  const pendingExtensionsCount = extensions.filter((e) => e.status === 'pending').length

  return {
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
  }
}
