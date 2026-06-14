import { Navigate, useLocation } from 'react-router-dom'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { useAuth } from '@/contexts/AuthProvider'
import { getPostLoginPath, LOGIN_PATH } from '@/lib/routes'

/**
 * Catch-all for unknown client routes — never shows a 404 page.
 * Sends users to login or their role dashboard instead.
 */
export function SafeRouteFallback() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AuthLoadingScreen label="Loading your account…" />
  }

  if (!user) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />
  }

  if (!profile) {
    return <AuthLoadingScreen label="Loading your profile…" />
  }

  return <Navigate to={getPostLoginPath(profile)} replace />
}
