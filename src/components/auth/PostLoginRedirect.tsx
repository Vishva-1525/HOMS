import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthProvider'
import { DashboardLoadingSkeleton } from '@/components/auth/DashboardLoadingSkeleton'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { getPostLoginPath, LOGIN_PATH } from '@/lib/routes'

const REDIRECT_DELAY_MS = 300

export function PostLoginRedirect() {
  const { user, profile, loading } = useAuth()
  const [showDashboard, setShowDashboard] = useState(false)

  useEffect(() => {
    if (!user || !profile) return
    const timer = window.setTimeout(() => setShowDashboard(true), REDIRECT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [user, profile])

  if (loading) {
    return <AuthLoadingScreen label="Signing you in..." />
  }

  if (!user) {
    return <Navigate to={LOGIN_PATH} replace />
  }

  if (!profile) {
    return <AuthLoadingScreen label="Loading your profile..." />
  }

  if (!showDashboard) {
    return <DashboardLoadingSkeleton />
  }

  return <Navigate to={getPostLoginPath(profile)} replace />
}
