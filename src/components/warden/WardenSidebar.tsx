import { NavLink } from 'react-router-dom'
import {
  IconBell,
  IconChartBar,
  IconClockPause,
  IconDashboard,
  IconDoorExit,
  IconLogout,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthProvider'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { to: '/warden/dashboard', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/warden/pending', label: 'Pending Requests', icon: IconClockPause, badge: 'pending' as const },
  { to: '/warden/students', label: 'Students', icon: IconUsers },
  { to: '/warden/out', label: 'Students Out', icon: IconDoorExit },
  { to: '/warden/reports', label: 'Reports', icon: IconChartBar },
  { to: '/warden/extensions', label: 'Extension Requests', icon: IconClockPause, badge: 'extensions' as const },
  { to: '/warden/notifications', label: 'Notifications', icon: IconBell },
  { to: '/warden/settings', label: 'Settings', icon: IconSettings },
]

export function WardenSidebar() {
  const { profile, signOut } = useAuth()
  const { pendingCount, pendingExtensionsCount } = useWardenDataContext()

  function getBadgeCount(badge?: 'pending' | 'extensions') {
    if (badge === 'pending') return pendingCount
    if (badge === 'extensions') return pendingExtensionsCount
    return 0
  }

  return (
    <aside className="glass-nav flex h-screen w-[240px] shrink-0 flex-col border-r shadow-xl shadow-slate-900/5">
      <div className="border-b border-white/40 px-5 py-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          HOMS Warden
        </p>
        <p className="mt-2 truncate text-base font-semibold tracking-tight">
          {profile?.full_name ?? 'Warden'}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, badge }) => {
          const count = getBadgeCount(badge)
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-white/45 hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" stroke={1.75} />
              <span className="flex-1 truncate">{label}</span>
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/40 p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-white/55 bg-white/35 hover:bg-white/55"
          size="sm"
          onClick={() => signOut()}
        >
          <IconLogout className="h-4 w-4" stroke={1.75} />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
