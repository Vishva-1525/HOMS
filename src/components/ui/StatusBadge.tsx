import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusBadgeStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'overdue'
  | 'expired'
  | 'return_completed'
  | 'completed'
  | 'cancelled'

export interface StatusBadgeProps {
  status: StatusBadgeStatus
  label?: string
  className?: string
}

const STATUS_LABELS: Record<StatusBadgeStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  overdue: 'Overdue',
  expired: 'Expired',
  return_completed: 'Return Completed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_STYLES: Record<StatusBadgeStatus, string> = {
  pending: 'bg-[var(--svce-warning-tint)] text-[var(--svce-warning)]',
  approved: 'bg-[var(--svce-green-tint)] text-[var(--svce-accent-green)]',
  rejected: 'bg-[var(--svce-danger-tint)] text-[var(--svce-danger)]',
  overdue:
    'border border-[color-mix(in_srgb,var(--svce-danger)_45%,transparent)] bg-[var(--svce-danger-tint)] font-semibold text-[var(--svce-danger)]',
  expired: 'bg-[var(--svce-orange-tint)] text-[var(--svce-accent-orange)]',
  return_completed: 'bg-[var(--svce-blue-tint)] text-[var(--svce-primary-blue)]',
  completed: 'bg-[var(--svce-blue-tint)] text-[var(--svce-primary-blue)]',
  cancelled: 'bg-[color-mix(in_srgb,var(--svce-text-muted)_18%,transparent)] text-[var(--svce-text-secondary)]',
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 text-[length:var(--svce-text-small)] font-medium',
        STATUS_STYLES[status],
        className,
      )}
    >
      {status === 'overdue' && (
        <AlertTriangle className="h-3 w-3 shrink-0 text-[var(--svce-danger)]" strokeWidth={2.5} aria-hidden />
      )}
      {label ?? STATUS_LABELS[status]}
    </span>
  )
}
