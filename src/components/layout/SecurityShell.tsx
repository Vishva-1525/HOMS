import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/layout/BottomNav'
import { DashboardBackground } from '@/components/layout/DashboardBackground'
import { getMobileNavForRole } from '@/components/layout/nav'

/** Full-screen layout for security guards — campus background, mobile bottom nav. */
export function SecurityShell() {
  const mobileNav = getMobileNavForRole('security_guard')

  return (
    <DashboardBackground className="flex min-h-[100dvh] flex-col">
      <div className="flex min-h-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </div>
      <BottomNav items={mobileNav} variant="dark" />
    </DashboardBackground>
  )
}
