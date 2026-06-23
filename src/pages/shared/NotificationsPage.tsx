import { PageHeader } from '@/components/ui/PageHeader'
import { PushPermissionBanner } from '@/components/pwa/PushPermissionBanner'
import { useNotifications } from '@/hooks/useNotifications'
import { getNotificationDotColor } from '@/lib/notifications'
import { formatRelativeTime } from '@/lib/relative-time'
import { cn } from '@/lib/utils'

export function NotificationsPage() {
  const { notifications, unreadCount, loading, markAllRead } = useNotifications()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Alerts for outpass requests, approvals, and updates."
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="text-sm font-medium text-[#1A5CA0] hover:underline"
            >
              Mark all read
            </button>
          ) : undefined
        }
      />

      <PushPermissionBanner />

      <div className="dashboard-surface overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-600">Loading notifications…</p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-600">No notifications yet.</p>
        ) : (
          <ul>
            {notifications.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'border-b border-white/50 px-4 py-4 last:border-0',
                  !item.read_at && 'bg-[#EBF3FF]/60',
                )}
              >
                <div className="flex gap-3">
                  <span
                    className="mt-2 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: getNotificationDotColor(item.type) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#1A1A2E]">{item.message}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatRelativeTime(item.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
