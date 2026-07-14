import { useCallback, useEffect, useState } from 'react'
import type { AdminStats } from '@/lib/admin-types'
import { cachedQuery, peekCachedQuery, setCachedQuery } from '@/lib/query-cache'
import { supabase } from '@/lib/supabase'

const EMPTY_STATS: AdminStats = {
  total_students: 0,
  active_outpasses: 0,
  currently_outside: 0,
  overdue_returns: 0,
  pending_approval: 0,
  passes_this_month: 0,
}

const STATS_CACHE_KEY = 'admin-stats'
const STATS_TTL_MS = 30_000

export function useAdminStats() {
  const cached = peekCachedQuery<AdminStats>(STATS_CACHE_KEY)
  const [stats, setStats] = useState<AdminStats>(cached ?? EMPTY_STATS)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (force = false) => {
    try {
      const data = force
        ? await (async () => {
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_stats')
            if (rpcError) throw new Error(rpcError.message)
            const next = (rpcData as AdminStats) ?? EMPTY_STATS
            setCachedQuery(STATS_CACHE_KEY, next, STATS_TTL_MS)
            return next
          })()
        : await cachedQuery(STATS_CACHE_KEY, STATS_TTL_MS, async () => {
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_stats')
            if (rpcError) throw new Error(rpcError.message)
            return (rpcData as AdminStats) ?? EMPTY_STATS
          })

      setStats(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!peekCachedQuery(STATS_CACHE_KEY)) setLoading(true)
      await fetchStats()
      if (!cancelled) setLoading(false)
    })()

    const interval = window.setInterval(() => {
      void fetchStats(true)
    }, 60_000)

    let channel: ReturnType<typeof supabase.channel> | null = null
    const realtimeTimer = window.setTimeout(() => {
      channel = supabase
        .channel('admin-stats')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'outpass_requests' }, () =>
          void fetchStats(true),
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () =>
          void fetchStats(true),
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () =>
          void fetchStats(true),
        )
        .subscribe()
    }, 2000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.clearTimeout(realtimeTimer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [fetchStats])

  return { stats, loading, error, refetch: () => fetchStats(true) }
}
