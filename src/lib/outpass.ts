import type { OutpassStatus, PassType } from '@/lib/types'

export const PASS_TYPE_LABELS: Record<PassType, string> = {
  outpass: 'Outpass',
  staypass: 'Staypass',
  night_pass: 'Night Pass',
  special_pass: 'Special Pass',
}

export const STATUS_LABELS: Record<OutpassStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  extended: 'Extended',
  cancelled: 'Cancelled',
}

export function getStatusChipClass(status: OutpassStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    case 'approved':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'extended':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'cancelled':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300'
  }
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatPassDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatReturnTime(dateIso: string): string {
  return new Date(dateIso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** e.g. "02 Jun, 4:00 PM" for dashboard tables */
export function formatTableDateTime(dateIso: string): string {
  const d = new Date(dateIso)
  const day = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  const time = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${day}, ${time}`
}

export function isPassActive(pass: { status: OutpassStatus; departure_at: string; return_by: string }): boolean {
  if (pass.status !== 'approved' && pass.status !== 'extended') return false
  const now = Date.now()
  return now >= new Date(pass.departure_at).getTime() && now <= new Date(pass.return_by).getTime()
}
