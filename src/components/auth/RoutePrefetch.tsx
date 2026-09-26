import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthProvider'

/**
 * After auth resolves, warm only the current role shell + home page once the browser is idle.
 * Avoids stealing bandwidth from first paint on weak campus Wi‑Fi.
 */
export function RoutePrefetch() {
  const { role, loading } = useAuth()

  useEffect(() => {
    if (loading || !role) return

    const warm = (importer: () => Promise<unknown>) => {
      void importer().catch(() => undefined)
    }

    const run = () => {
      if (role === 'admin') {
        warm(() => import('@/components/layout/AppShell'))
        warm(() => import('@/pages/admin/AdminDashboard'))
      } else if (role === 'warden') {
        warm(() => import('@/components/layout/WardenShell'))
        warm(() => import('@/pages/warden/WardenHomePage'))
      } else if (role === 'student') {
        warm(() => import('@/components/layout/StudentShell'))
        warm(() => import('@/pages/student/StudentHomePage'))
      } else if (role === 'parent') {
        warm(() => import('@/components/layout/ParentShell'))
        warm(() => import('@/pages/parent/ParentDashboard'))
      } else if (role === 'security_guard') {
        warm(() => import('@/components/layout/SecurityShell'))
        warm(() => import('@/pages/security/SecurityScanPage'))
      }
    }

    let idleId: number | undefined
    let timeoutId: number | undefined

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(run, { timeout: 3000 })
    } else {
      timeoutId = window.setTimeout(run, 2500)
    }

    return () => {
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [role, loading])

  return null
}
