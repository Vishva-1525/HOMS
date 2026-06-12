import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthProvider'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { CHANGE_PASSWORD_PATH, getDashboardPath, studentNeedsPasswordChange } from '@/lib/routes'
import type { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, role, loading } = useAuth()

  if (loading) {
    return <AuthLoadingScreen label="Loading your account..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile || !role) {
    return <AuthLoadingScreen label="Loading your profile..." />
  }

  if (studentNeedsPasswordChange(profile)) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getDashboardPath(role)} replace />
  }

  return <Outlet />
}
