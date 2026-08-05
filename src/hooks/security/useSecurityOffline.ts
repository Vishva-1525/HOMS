import { useCallback, useEffect, useRef, useState } from 'react'
import { isOnline, subscribeNetworkStatus } from '@/lib/network-status'
import { getLastPrefetchAt, prefetchSecurityCache } from '@/lib/offline/security-prefetch'
import { getOutboxCount } from '@/lib/offline/security-db'
import { syncSecurityOutbox } from '@/lib/offline/security-sync'

export function useSecurityOffline() {
  const [online, setOnline] = useState(isOnline())
  const [prefetching, setPrefetching] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastPrefetchAt, setLastPrefetchAt] = useState<string | null>(null)
  const [prefetchError, setPrefetchError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const prefetchingRef = useRef(false)
  const syncingRef = useRef(false)

  const refreshMeta = useCallback(async () => {
    const [count, lastAt] = await Promise.all([getOutboxCount(), getLastPrefetchAt()])
    setPendingCount(count)
    setLastPrefetchAt(lastAt)
  }, [])

  const prefetch = useCallback(async () => {
    if (!isOnline() || prefetchingRef.current) return null
    prefetchingRef.current = true
    setPrefetching(true)
    setPrefetchError(null)
    try {
      const result = await prefetchSecurityCache()
      setLastPrefetchAt(result.syncedAt)
      await refreshMeta()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download offline data.'
      setPrefetchError(message)
      return null
    } finally {
      prefetchingRef.current = false
      setPrefetching(false)
    }
  }, [refreshMeta])

  const sync = useCallback(async () => {
    if (!isOnline() || syncingRef.current) return null
    syncingRef.current = true
    setSyncing(true)
    setSyncError(null)
    try {
      const result = await syncSecurityOutbox()
      if (result.failed > 0 && result.errors[0]) {
        setSyncError(result.errors[0])
      }
      await refreshMeta()
      if (result.synced > 0) {
        await prefetch()
      }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync offline scans.'
      setSyncError(message)
      return null
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [prefetch, refreshMeta])

  useEffect(() => {
    void refreshMeta()
  }, [refreshMeta])

  useEffect(() => {
    return subscribeNetworkStatus((next) => {
      setOnline(next)
      if (next) {
        void sync()
        void prefetch()
      }
    })
  }, [prefetch, sync])

  useEffect(() => {
    if (online) {
      void prefetch()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- initial cache warm on mount

  return {
    online,
    prefetching,
    syncing,
    pendingCount,
    lastPrefetchAt,
    prefetchError,
    syncError,
    prefetch,
    sync,
    refreshMeta,
  }
}
