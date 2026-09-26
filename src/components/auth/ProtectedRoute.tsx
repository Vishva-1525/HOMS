import { Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { CHANGE_PASSWORD_PATH, getDashboardPath, studentNeedsPasswordChange } from '@/lib/routes'
import type { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
}

const PROFILE_WAIT_MS = 12_000

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, role, loading, refreshProfile, signOut } = useAuth()
  const [retrying, setRetrying] = useState(false)
  const [profileTimedOut, setProfileTimedOut] = useState(false)

  useEffect(() => {
    if (!user || profile) {
      setProfileTimedOut(false)
      return
    }
    const timer = window.setTimeout(() => setProfileTimedOut(true), PROFILE_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [user, profile])

  if (loading) {
    return <AuthLoadingScreen label="Loading your account..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile || !role) {
    // Stay on spinner while profile loads; recovery UI only after a real wait.
    if (!profileTimedOut) {
      return <AuthLoadingScreen label="Loading your profile..." />
    }

    return (
      <AuthLoadingScreen
        errorMessage="Couldn't load your profile. Check your connection and try again."
        retrying={retrying}
        onRetry={() => {
          setRetrying(true)
          setProfileTimedOut(false)
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
