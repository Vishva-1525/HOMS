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
  warden: 'Warden',
  security_guard: 'Security',
  parent: 'Parent',
  admin: 'Admin',
}
