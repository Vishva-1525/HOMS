import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import type { NotificationLog } from '@/lib/notifications'
import {
  requestNotificationDispatch,
  showLocalNotification,
} from '@/lib/push-notifications'
import { supabase } from '@/lib/supabase'

function notificationTitle(item: NotificationLog): string {
  switch (item.type) {
    case 'pending':
      return 'New outpass request'
    case 'approved':
      return 'Request approved'
    case 'rejected':
      return 'Request rejected'
    case 'extension':
      return 'Extension request'
    case 'overdue':
      return 'Overdue alert'
    default:
      return 'HOMS notification'
  }
}

function notificationUrl(role: string | null, type: string): string {
  if (role === 'warden') {
    if (type === 'extension') return '/warden/extensions'
    if (type === 'pending') return '/warden/pending'
    return '/warden/dashboard'
  }
  if (role === 'student') {
    return '/student/passes'
  }
  return '/'
}

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

      showLocalNotification(
        notificationTitle(item),
        item.message,
        notificationUrl(role, item.type),
      )
      void requestNotificationDispatch(item.id)
    },
    [role],
  )

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

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

    await supabase
      .from('notifications_log')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)

    fetchNotifications()
  }

  return { notifications, unreadCount, loading, markAllRead, refetch: fetchNotifications }
}
