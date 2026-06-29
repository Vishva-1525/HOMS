import { BarChart3, Clock, DoorOpen, LayoutDashboard, Timer } from 'lucide-react'
import type { NavConfig } from './types'

export const wardenNav: NavConfig = [
  { label: 'Dashboard', path: '/warden/dashboard', icon: LayoutDashboard, end: true, mobile: true },
  { label: 'Pending', path: '/warden/pending', icon: Clock, mobile: true },
  { label: 'Students Out', path: '/warden/out', icon: DoorOpen, mobile: true },
  { label: 'Extensions', path: '/warden/extensions', icon: Timer, mobile: true },
  { label: 'Reports', path: '/warden/reports', icon: BarChart3 },
]
