import { History, LayoutDashboard } from 'lucide-react'
import type { NavConfig } from './types'

export const parentNav: NavConfig = [
  { label: 'Dashboard', path: '/parent/dashboard', icon: LayoutDashboard, end: true, mobile: true },
  { label: 'Pass History', path: '/parent/history', icon: History, mobile: true },
]
