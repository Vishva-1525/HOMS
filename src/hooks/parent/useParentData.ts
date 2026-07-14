import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchParentWards, type ParentWard } from '@/lib/parent-data'
import {
  buildParentAlerts,
  getWardStatusSummary,
  type ParentAlert,
  type WardStatusSummary,
} from '@/lib/parent-alerts'
import { debounce } from '@/lib/debounce'
import { isPassCompleted } from '@/lib/pass-filters'
import { supabase } from '@/lib/supabase'
import type { ExtensionRequest, GateLog, OutpassRequest } from '@/lib/types'

export interface ParentStats {
  total: number
  pending: number
  approved: number
  completed: number
  overdue: number
}

const REALTIME_DEBOUNCE_MS = 600
const PASS_LIMIT = 100

export function useParentData() {
  const [wards, setWards] = useState<ParentWard[]>([])
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null)
  const [passes, setPasses] = useState<OutpassRequest[]>([])
  const [gateLogs, setGateLogs] = useState<GateLog[]>([])
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const passIdsRef = useRef<Set<string>>(new Set())
  const inFlightRef = useRef<Promise<void> | null>(null)

  const activeWard = useMemo(
    () => wards.find((w) => w.student.id === selectedWardId) ?? wards[0] ?? null,
    [wards, selectedWardId],
  )

  const fetchWardData = useCallback(async (studentId: string) => {
    if (inFlightRef.current) {
      await inFlightRef.current
      return
    }

    const run = (async () => {
      const passesResult = await supabase
        .from('outpass_requests')
        .select(
          'id, student_id, pass_type, destination, reason, departure_at, return_by, status, warden_remark, approved_at, is_overdue, created_at',
        )
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(PASS_LIMIT)

      if (passesResult.error) {
        setError(passesResult.error.message)
        return
      }

      const wardPasses = (passesResult.data ?? []) as OutpassRequest[]
      setPasses(wardPasses)
      passIdsRef.current = new Set(wardPasses.map((p) => p.id))

      const passIds = wardPasses.map((p) => p.id)
      if (passIds.length === 0) {
        setGateLogs([])
        setExtensions([])
        return
      }

      const [logsResult, extensionsResult] = await Promise.all([
        supabase
          .from('gate_logs')
          .select('id, outpass_id, scanned_by, event_type, scanned_at')
          .in('outpass_id', passIds)
          .order('scanned_at', { ascending: false }),
        supabase
          .from('extension_requests')
          .select('id, outpass_id, new_return_time, reason, status, created_at')
          .in('outpass_id', passIds)
          .order('created_at', { ascending: false }),
      ])

      if (logsResult.error) {
        console.warn('parent gate_logs soft-failed:', logsResult.error.message)
      } else {
        setGateLogs((logsResult.data ?? []) as GateLog[])
      }

      if (extensionsResult.error) {
        console.warn('parent extensions soft-failed:', extensionsResult.error.message)
      } else {
        setExtensions((extensionsResult.data ?? []) as ExtensionRequest[])
      }
    })()

    inFlightRef.current = run
    try {
      await run
    } finally {
      inFlightRef.current = null
    }
  }, [])

  const refetch = useCallback(async () => {
    if (!selectedWardId) return
    setLoading(true)
    setError(null)
    await fetchWardData(selectedWardId)
    setLoading(false)
  }, [selectedWardId, fetchWardData])

  useEffect(() => {
    let cancelled = false

    async function loadWards() {
      setLoading(true)
      setError(null)

      const { wards: wardList, error: wardError } = await fetchParentWards()
      if (cancelled) return

      if (wardError) {
        setError(wardError)
        setLoading(false)
        return
      }

      setWards(wardList)
      const firstWardId = wardList[0]?.student.id ?? null
      setSelectedWardId(firstWardId)

      if (firstWardId) {
        await fetchWardData(firstWardId)
      } else {
        setPasses([])
        setGateLogs([])
        setExtensions([])
      }

      setLoading(false)
    }

    void loadWards()
    return () => {
      cancelled = true
    }
  }, [fetchWardData])

  useEffect(() => {
    if (!selectedWardId) return

    const scheduleRefresh = debounce(() => {
      void fetchWardData(selectedWardId)
    }, REALTIME_DEBOUNCE_MS)

    const channel = supabase
      .channel(`parent-ward-${selectedWardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outpass_requests',
          filter: `student_id=eq.${selectedWardId}`,
        },
        () => scheduleRefresh(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, (payload) => {
        const row = (payload.new ?? payload.old) as { outpass_id?: string } | null
        if (row?.outpass_id && !passIdsRef.current.has(row.outpass_id)) return
        scheduleRefresh()
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'extension_requests' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { outpass_id?: string } | null
          if (row?.outpass_id && !passIdsRef.current.has(row.outpass_id)) return
          scheduleRefresh()
        },
      )
      .subscribe()

    return () => {
      scheduleRefresh.cancel()
      void supabase.removeChannel(channel)
    }
  }, [selectedWardId, fetchWardData])

  const wardName =
    activeWard?.profile?.full_name?.trim() || activeWard?.student.reg_number || 'Your ward'

  const wardStatus: WardStatusSummary = useMemo(
    () => getWardStatusSummary(passes, gateLogs),
    [passes, gateLogs],
  )

  const alerts: ParentAlert[] = useMemo(
    () => buildParentAlerts(passes, gateLogs, extensions, wardName),
    [passes, gateLogs, extensions, wardName],
  )

  const stats: ParentStats = useMemo(
    () => ({
      total: passes.length,
      pending: passes.filter((p) => p.status === 'pending').length,
      approved: passes.filter((p) => p.status === 'approved' || p.status === 'extended').length,
      completed: passes.filter((p) => isPassCompleted(p, gateLogs)).length,
      overdue: passes.filter(
        (p) =>
          (p.status === 'approved' || p.status === 'extended')
          && !isPassCompleted(p, gateLogs)
          && Date.now() > new Date(p.return_by).getTime(),
      ).length,
    }),
    [passes, gateLogs],
  )

  const selectWard = useCallback(
    async (wardId: string) => {
      setSelectedWardId(wardId)
      setLoading(true)
      setError(null)
      await fetchWardData(wardId)
      setLoading(false)
    },
    [fetchWardData],
  )

  return {
    wards,
    activeWard,
    selectedWardId,
    passes,
    gateLogs,
    extensions,
    wardStatus,
    alerts,
    stats,
    loading,
    error,
    selectWard,
    refetch,
  }
}
