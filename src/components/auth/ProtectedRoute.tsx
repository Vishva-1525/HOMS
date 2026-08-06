import { Navigate, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { CHANGE_PASSWORD_PATH, getDashboardPath, studentNeedsPasswordChange } from '@/lib/routes'
import type { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, role, loading, refreshProfile, signOut } = useAuth()
  const [retrying, setRetrying] = useState(false)

  if (loading) {
    return <AuthLoadingScreen label="Loading your account..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile || !role) {
    return (
      <AuthLoadingScreen
        errorMessage="Couldn't load your profile. Check your connection and try again."
        retrying={retrying}
        onRetry={() => {
          setRetrying(true)
          void refreshProfile().finally(() => setRetrying(false))
        }}
        onSignOut={() => {
          void signOut()
        }}
      />
    )
  }

  if (studentNeedsPasswordChange(profile)) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getDashboardPath(role)} replace />
  }

  return <Outlet />
}
