import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { getNotificationDotColor } from '@/lib/notifications'
import { formatRelativeTime } from '@/lib/relative-time'
import type { NotificationLog } from '@/lib/notifications'
import { cn } from '@/lib/utils'

interface NotificationDropdownProps {
  notifications: NotificationLog[]
  unreadCount: number
  onMarkAllRead: () => void
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAllRead,
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-[#4B5563] hover:bg-[#F5F7FA]"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-[#DC2626]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-[var(--svce-border-default)] bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--svce-border-default)] px-4 py-3">
            <p className="text-sm font-semibold text-[#1A1A2E]">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs font-medium text-[#1A5CA0] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[var(--svce-text-muted)]">
                No notifications yet.
              </li>
            ) : (
              notifications.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    'border-b border-[var(--svce-border-default)] px-4 py-3 last:border-0',
                    !item.read_at && 'bg-[#EBF3FF]',
                  )}
                >
                  <div className="flex gap-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: getNotificationDotColor(item.type) }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#1A1A2E]">{item.message}</p>
                      <p className="mt-0.5 text-xs text-[var(--svce-text-muted)]">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
