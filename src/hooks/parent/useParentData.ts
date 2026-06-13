import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchParentWards, type ParentWard } from '@/lib/parent-data'
import {
  buildParentAlerts,
  getWardStatusSummary,
  type ParentAlert,
  type WardStatusSummary,
} from '@/lib/parent-alerts'
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

export function useParentData() {
  const [wards, setWards] = useState<ParentWard[]>([])
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null)
  const [passes, setPasses] = useState<OutpassRequest[]>([])
  const [gateLogs, setGateLogs] = useState<GateLog[]>([])
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeWard = useMemo(
    () => wards.find((w) => w.student.id === selectedWardId) ?? wards[0] ?? null,
    [wards, selectedWardId],
  )

  const fetchWardData = useCallback(async (studentId: string) => {
    const passesResult = await supabase
      .from('outpass_requests')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (passesResult.error) {
      setError(passesResult.error.message)
      return
    }

    const wardPasses = (passesResult.data ?? []) as OutpassRequest[]
    setPasses(wardPasses)

    const passIds = wardPasses.map((p) => p.id)
    if (passIds.length === 0) {
      setGateLogs([])
      setExtensions([])
      return
    }

    const [logsResult, extensionsResult] = await Promise.all([
      supabase.from('gate_logs').select('*').in('outpass_id', passIds).order('scanned_at', {
        ascending: false,
      }),
      supabase
        .from('extension_requests')
        .select('*')
        .in('outpass_id', passIds)
        .order('created_at', { ascending: false }),
    ])

    if (logsResult.error) {
      setError(logsResult.error.message)
    } else {
      setGateLogs((logsResult.data ?? []) as GateLog[])
    }

    if (extensionsResult.error) {
      setError(extensionsResult.error.message)
    } else {
      setExtensions((extensionsResult.data ?? []) as ExtensionRequest[])
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

    loadWards()
    return () => {
      cancelled = true
    }
  }, [fetchWardData])

  useEffect(() => {
    if (!selectedWardId) return

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
        () => fetchWardData(selectedWardId),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () =>
        fetchWardData(selectedWardId),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extension_requests' }, () =>
        fetchWardData(selectedWardId),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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
