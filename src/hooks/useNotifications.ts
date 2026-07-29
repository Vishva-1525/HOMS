import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import {
  getNotificationTitle,
  getNotificationUrl,
  type NotificationLog,
} from '@/lib/notifications'
import { flushNotificationOutbox, showLocalNotification } from '@/lib/push-notifications'
import { supabase } from '@/lib/supabase'

export function useNotifications() {
  const { user, role } = useAuth()
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const knownIdsRef = useRef<Set<string>>(new Set())

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('notifications_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error && data) {
      const rows = data as NotificationLog[]
      for (const row of rows) {
        knownIdsRef.current.add(row.id)
      }
      setNotifications(rows)
    }
    setLoading(false)
  }, [user])

  const handleNewNotification = useCallback(
    (item: NotificationLog) => {
      if (knownIdsRef.current.has(item.id)) return
      knownIdsRef.current.add(item.id)

      setNotifications((prev) => {
        if (prev.some((row) => row.id === item.id)) return prev
        return [item, ...prev].slice(0, 30)
      })

      const url = getNotificationUrl(role, item)

      // Foreground: instant alert via service worker (Realtime is faster than server push).
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        showLocalNotification(
          getNotificationTitle(item.type),
          item.message,
          url,
          item.id,
        )
      }
      // Background / closed: server push from outbox dispatch reaches the device.
    },
    [role],
  )

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Recover stuck outbox rows when the app opens.
  useEffect(() => {
    if (!user) return
    void flushNotificationOutbox()
  }, [user])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications_log',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          handleNewNotification(payload.new as NotificationLog)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, handleNewNotification])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  async function markAllRead() {
    if (!user) return

    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id)
    if (unreadIds.length === 0) return

    const readAt = new Date().toISOString()
    await supabase
      .from('notifications_log')
      .update({ read_at: readAt })
      .in('id', unreadIds)

    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: readAt })))
  }

  async function markOneRead(id: string) {
    if (!user) return

    const readAt = new Date().toISOString()
    await supabase.from('notifications_log').update({ read_at: readAt }).eq('id', id)

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: readAt } : n)),
    )
  }

  function getUrlForNotification(notification: NotificationLog): string {
    return getNotificationUrl(role, notification)
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAllRead,
    markOneRead,
    getUrlForNotification,
    refetch: fetchNotifications,
  }
}
