import type { UserRole } from '@/lib/types'
import { adminNav } from './adminNav'
import { parentNav } from './parentNav'
import { securityNav } from './securityNav'
import { studentNav } from './studentNav'
import type { NavConfig } from './types'
import { wardenNav } from './wardenNav'

const NAV_BY_ROLE: Record<UserRole, NavConfig> = {
  student: studentNav,
  warden: wardenNav,
  security_guard: securityNav,
  parent: parentNav,
  admin: adminNav,
}

export function getNavForRole(role: UserRole | null): NavConfig {
  if (!role) return []
  return NAV_BY_ROLE[role]
}

export function getMobileNavForRole(role: UserRole | null): NavConfig {
  const items = getNavForRole(role).filter((item) => item.mobile)
  return items.slice(0, 4)
}

export function getBreadcrumbLabel(pathname: string, nav: NavConfig): string {
  const exact = nav.find((item) => item.path === pathname)
  if (exact) return exact.label

  const partial = nav.find((item) => pathname.startsWith(item.path) && item.path !== '/')
  return partial?.label ?? 'Dashboard'
}

export * from './types'
export { studentNav, wardenNav, securityNav, parentNav, adminNav }
