import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '@/lib/types'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  end?: boolean
  /** Include in mobile bottom navigation (up to 4 per role). */
  mobile?: boolean
}

export type NavConfig = NavItem[]

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  warden: 'RT',
  security_guard: 'Security',
  parent: 'Parent',
  admin: 'Admin',
}

/** RT vs superior warden display name (same DB role). */
export function getRoleDisplayLabel(
  role: UserRole,
  wardenTier?: 'rt' | 'superior' | null,
): string {
  if (role === 'warden') {
    return wardenTier === 'superior' ? 'Warden' : 'RT'
  }
  return ROLE_LABELS[role]
}
