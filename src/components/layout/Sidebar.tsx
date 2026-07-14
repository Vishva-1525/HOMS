import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { ShellLogo } from '@/components/layout/ShellLogo'
import { UserAvatar } from '@/components/layout/UserAvatar'
import type { NavItem } from '@/components/layout/nav'
import { ROLE_LABELS } from '@/components/layout/nav'
import type { UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  navItems: NavItem[]
  role: UserRole
  userName: string
  onSignOut: () => void | Promise<void>
  getNavBadgeCount?: (path: string) => number
  signingOut?: boolean
}

export function Sidebar({
  collapsed,
  navItems,
  role,
  userName,
  onSignOut,
  getNavBadgeCount,
  signingOut = false,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/10 bg-[#0D3F72]/92 shadow-xl shadow-slate-900/10 backdrop-blur-xl transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex flex-col gap-3 border-b border-white/10', collapsed ? 'items-center px-2 py-5' : 'px-5 py-5')}>
        <ShellLogo collapsed={collapsed} showLabel={!collapsed} />
        {!collapsed && (
          <span className="inline-flex w-fit rounded-full bg-[#1A5CA0] px-2.5 py-0.5 text-xs font-medium text-white">
            {ROLE_LABELS[role]}
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const badge = getNavBadgeCount?.(item.path) ?? 0

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? cn(
                        'border-l-[3px] border-[#E87722] bg-[#1A5CA0]',
                        collapsed ? 'pl-2' : 'pl-[9px]',
                      )
                    : 'border-l-[3px] border-transparent hover:bg-[#1A5CA0]/60',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-[10px] font-bold text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className={cn('space-y-2 border-t border-white/10 p-3', collapsed && 'px-2')}>
        <div
          className={cn(
            'flex items-center gap-3',
            collapsed && 'flex-col justify-center gap-2',
          )}
        >
          <UserAvatar name={userName} size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="truncate text-xs text-white/70">{ROLE_LABELS[role]}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void onSignOut()}
          disabled={signingOut}
          className={cn(
            'sidebar-logout-btn w-full',
            collapsed && 'px-2',
            signingOut && 'cursor-wait opacity-70',
          )}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.85} />
          {!collapsed && <span>{signingOut ? 'Signing out…' : 'Log out'}</span>}
        </button>
      </div>
    </aside>
  )
}
