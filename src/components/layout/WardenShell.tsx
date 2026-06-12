import { AppShell } from '@/components/layout/AppShell'
import { NotificationDropdown } from '@/components/layout/NotificationDropdown'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { useWardenNotifications } from '@/hooks/warden/useWardenNotifications'

export function WardenShell() {
  const { pendingCount, pendingExtensionsCount } = useWardenDataContext()
  const { notifications, unreadCount, markAllRead } = useWardenNotifications()

  function getNavBadgeCount(path: string): number {
    if (path === '/warden/pending') return pendingCount
    if (path === '/warden/extensions') return pendingExtensionsCount
    return 0
  }

  return (
    <AppShell
      getNavBadgeCount={getNavBadgeCount}
      unreadNotifications={unreadCount}
      notificationSlot={
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={markAllRead}
        />
      }
    />
  )
}
