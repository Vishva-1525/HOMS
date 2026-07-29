import { AppShell } from '@/components/layout/AppShell'
import { NotificationDropdown } from '@/components/layout/NotificationDropdown'
import { useNotifications } from '@/hooks/useNotifications'

export function StudentShell() {
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications()

  return (
    <AppShell
      unreadNotifications={unreadCount}
      notificationSlot={
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={markAllRead}
          onMarkOneRead={markOneRead}
        />
      }
    />
  )
}
