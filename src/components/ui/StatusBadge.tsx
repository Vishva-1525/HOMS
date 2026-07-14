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
  pending: 'bg-[#FFF8E1] text-[#92400E]',
  approved: 'bg-[var(--svce-green-tint)] text-[#166534]',
  rejected: 'bg-[var(--svce-danger-tint)] text-[#991B1B]',
  overdue:
    'border border-[#FECACA] bg-[#FEF2F2] font-semibold text-[#991B1B] shadow-[inset_0_0_0_1px_rgba(252,165,165,0.35)]',
  expired: 'bg-[#FFEDD5] text-[#9A3412]',
  return_completed: 'bg-[var(--svce-blue-tint)] text-[#1E40AF]',
  completed: 'bg-[var(--svce-blue-tint)] text-[#1E40AF]',
  cancelled: 'bg-[#F3F4F6] text-[#6B7280]',
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
        <AlertTriangle className="h-3 w-3 shrink-0 text-[#DC2626]" strokeWidth={2.5} aria-hidden />
      )}
      {label ?? STATUS_LABELS[status]}
    </span>
  )
}
