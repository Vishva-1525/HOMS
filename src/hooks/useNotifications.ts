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
      .select('id, user_id, type, message, read_at, created_at, outpass_id, extension_id')
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

      // Realtime path: show a system notification whenever the client receives the row
      // (foreground or backgrounded tab). Fully closed apps rely on server Web Push.
      showLocalNotification(
        getNotificationTitle(item.type),
        item.message,
        url,
        item.id,
      )
    },
    [role],
  )

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Recover stuck outbox rows once per browser session (avoid mount stampede).
  useEffect(() => {
    if (!user) return
    const key = 'homs-outbox-flushed'
    try {
      if (sessionStorage.getItem(key) === '1') return
      sessionStorage.setItem(key, '1')
    } catch {
      // ignore
    }
    const timer = window.setTimeout(() => {
      void flushNotificationOutbox()
    }, 2500)
    return () => window.clearTimeout(timer)
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
