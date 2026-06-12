import { NavLink } from 'react-router-dom'
import {
  IconBell,
  IconChartBar,
  IconClockPause,
  IconDashboard,
  IconDoorExit,
  IconSettings,
} from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthProvider'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { to: '/warden/dashboard', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/warden/pending', label: 'Pending Requests', icon: IconClockPause, badge: 'pending' as const },
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
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r bg-card">
      <div className="border-b px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          HOMS Warden
        </p>
        <p className="mt-1 truncate text-sm font-medium">{profile?.full_name ?? 'Warden'}</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, badge }) => {
          const count = getBadgeCount(badge)
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" stroke={1.75} />
              <span className="flex-1 truncate">{label}</span>
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t p-3">
        <Button type="button" variant="outline" className="w-full" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </aside>
  )
}
