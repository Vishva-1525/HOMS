import { useCallback, useEffect, useState } from 'react'
import type { AdminStats } from '@/lib/admin-types'
import { supabase } from '@/lib/supabase'

const EMPTY_STATS: AdminStats = {
  total_students: 0,
  active_outpasses: 0,
  currently_outside: 0,
  overdue_returns: 0,
  pending_approval: 0,
  passes_this_month: 0,
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('get_admin_stats')
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setStats((data as AdminStats) ?? EMPTY_STATS)
    setError(null)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchStats().finally(() => setLoading(false))

    const interval = window.setInterval(fetchStats, 60_000)

    const channel = supabase
      .channel('admin-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outpass_requests' }, () =>
        fetchStats(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () =>
        fetchStats(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () =>
        fetchStats(),
      )
      .subscribe()

    return () => {
      window.clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}
