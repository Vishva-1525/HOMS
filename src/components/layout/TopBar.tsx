import { Bell, Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { ShellLogo } from '@/components/layout/ShellLogo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { useGreeting } from '@/hooks/useGreeting'
import { cn } from '@/lib/utils'

interface TopBarProps {
  breadcrumb: string
  userName: string
  photoUrl?: string | null
  collapsed: boolean
  onToggleSidebar: () => void
  onOpenMobileMenu: () => void
  unreadNotifications?: number
  notificationSlot?: ReactNode
}

const ICON_BTN =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-[var(--glass-bg)]'

export function TopBar({
  breadcrumb,
  userName,
  photoUrl,
  collapsed,
  onToggleSidebar,
  onOpenMobileMenu,
  unreadNotifications = 0,
  notificationSlot,
}: TopBarProps) {
  const firstName = userName.split(/\s+/)[0] ?? userName
  const greeting = useGreeting()

  return (
    <header className="glass-nav sticky top-0 z-30 flex h-[60px] shrink-0 items-center border-b px-3 pt-[max(0px,env(safe-area-inset-top))] sm:px-4 md:px-6">
      {/* Mobile: fixed 3-column grid - menu | college name | controls */}
      <div className="grid w-full min-w-0 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 md:hidden">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className={ICON_BTN}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <div className="min-w-0 px-1">
          <ShellLogo tone="light" compact className="max-w-full" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle className={ICON_BTN} />
          {notificationSlot ?? (
            <button type="button" className={cn(ICON_BTN, 'relative')} aria-label="Notifications">
              <Bell className="h-5 w-5" strokeWidth={1.75} />
              {unreadNotifications > 0 && (
                <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-[#DC2626]" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={ICON_BTN}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <p className="truncate text-sm font-semibold text-slate-900">{breadcrumb}</p>
      </div>

      <div className="ml-auto hidden shrink-0 items-center gap-3 md:flex">
        <ThemeToggle className={ICON_BTN} />

        {notificationSlot ?? (
          <button type="button" className={cn(ICON_BTN, 'relative')} aria-label="Notifications">
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            {unreadNotifications > 0 && (
              <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-[#DC2626]" />
            )}
          </button>
        )}

        <p className="hidden text-sm text-slate-600 lg:block">
          {greeting},&nbsp;<span className="font-semibold text-slate-900">{firstName}</span>
        </p>

        <UserAvatar name={userName} photoUrl={photoUrl} size="sm" className="hidden sm:flex" />
      </div>
    </header>
  )
}
