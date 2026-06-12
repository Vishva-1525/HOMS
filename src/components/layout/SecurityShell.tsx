import { Outlet } from 'react-router-dom'
import { DashboardBackground } from '@/components/layout/DashboardBackground'

/** Full-screen layout for security guards — campus background, no sidebar. */
export function SecurityShell() {
  return (
    <DashboardBackground>
      <Outlet />
    </DashboardBackground>
  )
}
