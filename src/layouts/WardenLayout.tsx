import { Outlet } from 'react-router-dom'
import { WardenSidebar } from '@/components/warden/WardenSidebar'
import { WardenDataProvider } from '@/contexts/WardenDataContext'

export function WardenLayout() {
  return (
    <WardenDataProvider>
      <div className="flex min-h-screen bg-background">
        <WardenSidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </WardenDataProvider>
  )
}
