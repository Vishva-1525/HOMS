import { QrCode } from 'lucide-react'
import type { NavConfig } from './types'

export const securityNav: NavConfig = [
  { label: 'Scan', path: '/security/scan', icon: QrCode, end: true, mobile: true },
]
