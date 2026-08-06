import { BarChart3, Clock, DoorOpen, FileText, LayoutDashboard, Settings, Timer, UserCog, Users } from 'lucide-react'
import type { NavConfig } from './types'

export const wardenNav: NavConfig = [
  { label: 'Dashboard', path: '/warden/dashboard', icon: LayoutDashboard, end: true, mobile: true },
  { label: 'Pending', path: '/warden/pending', icon: Clock, mobile: true },
  { label: 'Students', path: '/warden/students', icon: Users, mobile: true },
  { label: 'Students Out', path: '/warden/out', icon: DoorOpen, mobile: true },
  { label: 'Extensions', path: '/warden/extensions', icon: Timer },
  { label: 'Staff', path: '/warden/staff', icon: UserCog },
  { label: 'All Passes', path: '/warden/passes', icon: FileText },
  { label: 'Reports', path: '/warden/reports', icon: BarChart3 },
  { label: 'Settings', path: '/warden/settings', icon: Settings },
]
