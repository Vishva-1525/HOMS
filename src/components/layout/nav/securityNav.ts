import { ClipboardList, QrCode, Settings } from 'lucide-react'
import type { NavConfig } from './types'

export const securityNav: NavConfig = [
  { label: 'Scan QR', path: '/security/scan', icon: QrCode, end: true, mobile: true },
  { label: "Today's Log", path: '/security/log', icon: ClipboardList, mobile: true },
  { label: 'Settings', path: '/security/settings', icon: Settings, mobile: true },
]
