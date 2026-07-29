import { Bell, Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { ShellLogo } from '@/components/layout/ShellLogo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { getGreeting } from '@/lib/outpass'
import { cn } from '@/lib/utils'

interface TopBarProps {
  breadcrumb: string
  userName: string
  collapsed: boolean
  onToggleSidebar: () => void
  onOpenMobileMenu: () => void
  unreadNotifications?: number
  notificationSlot?: ReactNode
}

export function TopBar({
  breadcrumb,
  userName,
  collapsed,
  onToggleSidebar,
  onOpenMobileMenu,
  unreadNotifications = 0,
  notificationSlot,
}: TopBarProps) {
  const firstName = userName.split(/\s+/)[0] ?? userName

  return (
    <header className="glass-nav sticky top-0 z-30 flex h-[60px] shrink-0 items-center border-b px-3 pt-[max(0px,env(safe-area-inset-top))] sm:px-4 md:px-6">
      {/* Mobile left: hamburger — fixed width so centre logo doesn't shift */}
      <div className="flex w-10 shrink-0 items-center md:hidden">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-md p-2 text-slate-600 hover:bg-white/50"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Desktop left: hamburger + breadcrumb */}
      <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-2 text-slate-600 hover:bg-white/50"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <p className="truncate text-sm font-semibold text-slate-900">{breadcrumb}</p>
      </div>

      {/* Mobile centre: logo — flex-1 centres between left and right fixed areas */}
      <div className="flex flex-1 justify-center md:hidden">
        <ShellLogo />
      </div>

      {/* Right: notifications, greeting, avatar — fixed width matches left so logo stays centred */}
      <div className="flex shrink-0 items-center gap-1.5 md:ml-auto md:gap-3">
        <ThemeToggle />

        {notificationSlot ?? (
          <button
            type="button"
            className="relative rounded-md p-2 text-slate-600 hover:bg-white/50"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            {unreadNotifications > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-[#DC2626]" />
            )}
          </button>
        )}

        <p className={cn('hidden text-sm text-slate-600 sm:block')}>
          {getGreeting()},&nbsp;<span className="font-semibold text-slate-900">{firstName}</span>
        </p>

        <UserAvatar name={userName} size="sm" className="hidden sm:flex" />
      </div>
    </header>
  )
}
