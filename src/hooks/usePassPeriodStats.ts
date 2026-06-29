import { useCallback, useEffect, useState } from 'react'
import type { PassPeriodStats, PassPeriodStatsRpc, PassStatsPeriod } from '@/lib/pass-period-stats'
import { supabase } from '@/lib/supabase'

const EMPTY: PassPeriodStats = {
  period: 'weekly',
  pending: 0,
  approved: 0,
  rejected: 0,
  overdue: 0,
}

export function usePassPeriodStats(period: PassStatsPeriod) {
  const [stats, setStats] = useState<PassPeriodStats>({ ...EMPTY, period })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc('get_pass_period_stats', {
      p_period: period,
    })

    if (rpcError) {
      setError(rpcError.message)
      setStats({ ...EMPTY, period })
    } else {
      const row = data as PassPeriodStatsRpc
      setStats({
        period,
        pending: row.pending ?? 0,
        approved: row.approved ?? 0,
        rejected: row.rejected ?? 0,
        overdue: row.overdue ?? 0,
      })
    }

    setLoading(false)
  }, [period])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}
