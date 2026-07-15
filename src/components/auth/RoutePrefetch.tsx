import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthProvider'

/**
 * After auth resolves, warm the role shell + primary pages so navigation feels instant.
 */
export function RoutePrefetch() {
  const { role, loading } = useAuth()

  useEffect(() => {
    if (loading || !role) return

    const warm = (importer: () => Promise<unknown>) => {
      void importer().catch(() => undefined)
    }

    if (role === 'admin') {
      warm(() => import('@/components/layout/AppShell'))
      warm(() => import('@/pages/admin/AdminDashboard'))
      warm(() => import('@/pages/admin/AdminStudentsPage'))
      warm(() => import('@/pages/admin/AdminPassesPage'))
      warm(() => import('@/pages/admin/AdminStaffPage'))
    } else if (role === 'warden') {
      warm(() => import('@/components/layout/WardenShell'))
      warm(() => import('@/pages/warden/WardenHomePage'))
      warm(() => import('@/pages/warden/PendingRequestsPage'))
      warm(() => import('@/pages/warden/WardenStudentsPage'))
    } else if (role === 'student') {
      warm(() => import('@/components/layout/StudentShell'))
      warm(() => import('@/pages/student/StudentHomePage'))
      warm(() => import('@/pages/student/StudentPassesPage'))
    } else if (role === 'security_guard') {
      warm(() => import('@/components/layout/SecurityShell'))
      warm(() => import('@/pages/security/SecurityScanPage'))
    } else if (role === 'parent') {
      warm(() => import('@/components/layout/ParentShell'))
      warm(() => import('@/pages/parent/ParentDashboard'))
    }
  }, [role, loading])

  return null
}
