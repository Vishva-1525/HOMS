import type { GateLog, OutpassRequest, OutpassStatus } from '@/lib/types'
import type { StatusBadgeStatus } from '@/components/ui/StatusBadge'
import { isPassCompleted, isPassOverdue } from '@/lib/pass-filters'

export function getPassDisplayStatus(
  pass: OutpassRequest,
  gateLogs: GateLog[] = [],
): StatusBadgeStatus {
  if (isPassOverdue(pass, gateLogs)) return 'overdue'
  if (isPassCompleted(pass, gateLogs)) return 'completed'

  switch (pass.status) {
    case 'pending':
      return 'pending'
    case 'approved':
      return 'approved'
    case 'extended':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'cancelled':
      return 'cancelled'
  }
}

export function getPassStatusLabel(status: OutpassStatus, gateLogs: GateLog[], pass: OutpassRequest): string {
  if (isPassOverdue(pass, gateLogs)) return 'Overdue'
  if (isPassCompleted(pass, gateLogs)) return 'Completed'
  if (status === 'extended') return 'Extended'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
