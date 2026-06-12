import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import type { NotificationLog } from '@/lib/notifications'
import { supabase } from '@/lib/supabase'

export function useWardenNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('notifications_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setNotifications(data as NotificationLog[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`warden-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications_log',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchNotifications(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchNotifications])

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
