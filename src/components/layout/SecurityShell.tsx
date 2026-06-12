import { Outlet } from 'react-router-dom'

/** Full-screen layout for security guards — no sidebar or bottom nav. */
export function SecurityShell() {
  return (
    <div className="min-h-[100dvh] bg-[#0D3F72]">
      <Outlet />
    </div>
  )
}
