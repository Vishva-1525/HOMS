import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import { ShellLogo } from '@/components/layout/ShellLogo'
import { UserAvatar } from '@/components/layout/UserAvatar'
import type { NavItem } from '@/components/layout/nav'
import { ROLE_LABELS } from '@/components/layout/nav'
import type { UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  navItems: NavItem[]
  role: UserRole
  userName: string
  onSignOut: () => void
  getNavBadgeCount?: (path: string) => number
}

export function MobileDrawer({
  open,
  onClose,
  navItems,
  role,
  userName,
  onSignOut,
  getNavBadgeCount,
}: MobileDrawerProps) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-[min(280px,85vw)] flex-col bg-[#0D3F72] shadow-lg">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <ShellLogo />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-3">
          <span className="inline-flex rounded-full bg-[#1A5CA0] px-2.5 py-0.5 text-xs font-medium text-white">
            {ROLE_LABELS[role]}
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const badge = getNavBadgeCount?.(item.path) ?? 0

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white transition-colors',
                    isActive
                      ? 'border-l-[3px] border-[#E87722] bg-[#1A5CA0] pl-[9px]'
                      : 'border-l-[3px] border-transparent hover:bg-[#1A5CA0]/60',
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-[10px] font-bold text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <UserAvatar name={userName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="truncate text-xs text-white/70">{ROLE_LABELS[role]}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose()
                onSignOut()
              }}
              className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
