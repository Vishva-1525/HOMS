import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '@/components/layout/BottomNav'
import { DashboardBackground } from '@/components/layout/DashboardBackground'
import { MobileDrawer } from '@/components/layout/MobileDrawer'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { getBreadcrumbLabel, getMobileNavForRole, getNavForRole } from '@/components/layout/nav'
import { useAuth } from '@/contexts/AuthProvider'
import { cn } from '@/lib/utils'

interface AppShellProps {
  getNavBadgeCount?: (path: string) => number
  unreadNotifications?: number
  notificationSlot?: React.ReactNode
}

export function AppShell({
  getNavBadgeCount,
  unreadNotifications = 0,
  notificationSlot,
}: AppShellProps) {
  const { profile, role, signOut } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  if (!profile || !role) return null

  const navItems = getNavForRole(role)
  const mobileNavItems = getMobileNavForRole(role)
  const breadcrumb = getBreadcrumbLabel(location.pathname, navItems)
  const userName = profile.full_name

  return (
    <DashboardBackground>
      <Sidebar
        collapsed={collapsed}
        navItems={navItems}
        role={role}
        userName={userName}
        onSignOut={() => signOut()}
        getNavBadgeCount={getNavBadgeCount}
      />

      <MobileDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        navItems={navItems}
        role={role}
        userName={userName}
        onSignOut={() => signOut()}
        getNavBadgeCount={getNavBadgeCount}
      />

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[margin] duration-200',
          collapsed ? 'md:ml-16' : 'md:ml-60',
        )}
      >
        <TopBar
          breadcrumb={breadcrumb}
          userName={userName}
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((value) => !value)}
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
          unreadNotifications={unreadNotifications}
          notificationSlot={notificationSlot}
        />

        <main className="flex-1 px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-6">
          <div className="mx-auto max-w-[1280px]">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav items={mobileNavItems} />
    </DashboardBackground>
  )
}
