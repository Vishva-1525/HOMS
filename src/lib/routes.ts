import type { Profile, UserRole } from '@/lib/types'

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  student: '/student/dashboard',
  warden: '/warden/dashboard',
  security_guard: '/security/scan',
  parent: '/parent/dashboard',
  admin: '/admin/dashboard',
}

export const CHANGE_PASSWORD_PATH = '/change-password'
export const LOGIN_PATH = '/login'
export const FORGOT_PASSWORD_PATH = '/forgot-password'

export function getDashboardPath(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role]
}

export function getPostLoginPath(profile: Profile): string {
  if (profile.role === 'student' && !profile.password_changed) {
    return CHANGE_PASSWORD_PATH
  }
  return getDashboardPath(profile.role)
}

export function studentNeedsPasswordChange(profile: Profile | null): boolean {
  return profile?.role === 'student' && profile.password_changed === false
}
