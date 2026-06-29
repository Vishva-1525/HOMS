import { format, parseISO } from 'date-fns'
import { PASS_TYPE_LABELS } from '@/lib/outpass'
import type { ReportRow } from '@/lib/report-types'
import type { PassType } from '@/lib/types'

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy')
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'hh:mm aa')
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy hh:mm aa')
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

export function formatGeneratedTimestamp(date = new Date()): string {
  return date.toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
  })
}

/** Matches on-screen StatusBadge label in ReportsPanel. */
export function formatReportStatus(row: ReportRow): string {
  if (row.is_overdue) return 'Overdue'
  if (row.actual_entry_time) return 'Completed'
  if (row.status === 'extended') return 'Extended'
  if (row.status === 'approved') return 'Approved'
  if (row.status === 'pending') return 'Pending'
  if (row.status === 'rejected') return 'Rejected'
  if (row.status === 'cancelled') return 'Cancelled'
  return row.status
}

export function formatPassTypeLabel(passType: string): string {
  return PASS_TYPE_LABELS[passType as PassType] ?? passType
}

export function formatOverdueLabel(isOverdue: boolean): string {
  return isOverdue ? 'Yes' : 'No'
}
