import { Outlet } from 'react-router-dom'
import { DashboardBackground } from '@/components/layout/DashboardBackground'
import { WardenSidebar } from '@/components/warden/WardenSidebar'
import { WardenDataProvider } from '@/contexts/WardenDataContext'

export function WardenLayout() {
  return (
    <WardenDataProvider>
      <DashboardBackground>
        <div className="flex min-h-screen">
          <WardenSidebar />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </DashboardBackground>
    </WardenDataProvider>
  )
}
