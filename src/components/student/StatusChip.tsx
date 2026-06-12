import type { OutpassStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/outpass'
import { StatusBadge, type StatusBadgeStatus } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'

const OUTPASS_TO_BADGE: Record<OutpassStatus, StatusBadgeStatus> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  extended: 'completed',
  cancelled: 'cancelled',
}

export function StatusChip({ status, className }: { status: OutpassStatus; className?: string }) {
  return (
    <StatusBadge
      status={OUTPASS_TO_BADGE[status]}
      label={STATUS_LABELS[status]}
      className={cn(className)}
    />
  )
}
