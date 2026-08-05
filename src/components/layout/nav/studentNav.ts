import { Clock, FilePlus, Home, Settings, User } from 'lucide-react'
import type { NavConfig } from './types'

export const studentNav: NavConfig = [
  { label: 'Home', path: '/student/dashboard', icon: Home, end: true, mobile: true },
  { label: 'New Request', path: '/student/new-request', icon: FilePlus, mobile: true },
  { label: 'My Passes', path: '/student/passes', icon: Clock, mobile: true },
  { label: 'Profile', path: '/student/profile', icon: User, mobile: true },
  { label: 'Settings', path: '/student/settings', icon: Settings },
]
