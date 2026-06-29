import { BarChart3, CalendarDays, FileText, LayoutDashboard, Settings, UserCog, Users } from 'lucide-react'
import type { NavConfig } from './types'

export const adminNav: NavConfig = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, end: true, mobile: true },
  { label: 'Students', path: '/admin/students', icon: Users, mobile: true },
  { label: 'Staff', path: '/admin/staff', icon: UserCog },
  { label: 'All Passes', path: '/admin/passes', icon: FileText, mobile: true },
  { label: 'Calendar', path: '/admin/calendar', icon: CalendarDays },
  { label: 'Reports', path: '/admin/reports', icon: BarChart3, mobile: true },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
]
