import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthProvider'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { getPostLoginPath, LOGIN_PATH } from '@/lib/routes'

export function PostLoginRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <AuthLoadingScreen label="Signing you in..." />
  }

  if (!user) {
    return <Navigate to={LOGIN_PATH} replace />
  }

  if (!profile) {
    return <AuthLoadingScreen label="Loading your profile..." />
  }

  return <Navigate to={getPostLoginPath(profile)} replace />
}
