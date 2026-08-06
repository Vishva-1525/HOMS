import { Outlet } from 'react-router-dom'
import { SuspenseOutlet } from '@/components/layout/SuspenseOutlet'

/** Full-screen security gate scanner — no bottom nav clutter. */
export function SecurityShell() {
  return (
    <div className="min-h-[100dvh] bg-[#0B1220]">
      <SuspenseOutlet label="Loading scanner…">
        <Outlet />
      </SuspenseOutlet>
    </div>
  )
}
