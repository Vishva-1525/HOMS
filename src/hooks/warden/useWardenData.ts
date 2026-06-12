import { useCallback, useEffect, useMemo, useState } from 'react'
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
  error: string | null
  refetch: () => Promise<void>
}

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setError(null)

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
      setError(passesResult.error.message)
      setLoading(false)
      return
    }

    if (extensionsResult.error) {
      setError(extensionsResult.error.message)
      setLoading(false)
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
        setError(logsError.message)
      } else {
        setGateLogs((logs ?? []) as GateLog[])
      }
    } else {
      setGateLogs([])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const channel = supabase
      .channel('warden-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outpass_requests' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gate_logs' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'extension_requests' },
        () => fetchData(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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
    loading,
    error,
    refetch: fetchData,
  }
}
