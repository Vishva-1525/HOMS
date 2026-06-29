import type { GateLog, OutpassRequest } from '@/lib/types'
import { SEVERE_OVERDUE_MS, getReturnOverdueMs, hasEntryLog } from '@/lib/pass-filters'

export type PassClassification =
  | 'pending'
  | 'approved'
  | 'expired'
  | 'overdue'
  | 'return_completed'
  | 'rejected'
  | 'cancelled'

export const PASS_CLASSIFICATION_LABELS: Record<PassClassification, string> = {
  pending: 'Pending',
  approved: 'Approved',
  expired: 'Expired',
  overdue: 'Overdue',
  return_completed: 'Return Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export function classifyPass(pass: OutpassRequest, gateLogs: GateLog[] = []): PassClassification {
  if (pass.status === 'cancelled') return 'cancelled'
  if (pass.status === 'rejected') return 'rejected'
  if (pass.status === 'pending') return 'pending'
  if (hasEntryLog(pass.id, gateLogs)) return 'return_completed'

  if (pass.status === 'approved' || pass.status === 'extended') {
    const overdueMs = getReturnOverdueMs(pass)
    if (pass.is_overdue || overdueMs >= SEVERE_OVERDUE_MS) return 'overdue'
    if (overdueMs > 0) return 'expired'
    return 'approved'
  }

  return 'pending'
}

export function classificationToBadgeStatus(
  classification: PassClassification,
): import('@/components/ui/StatusBadge').StatusBadgeStatus {
  switch (classification) {
    case 'pending':
      return 'pending'
    case 'approved':
      return 'approved'
    case 'expired':
      return 'expired'
    case 'overdue':
      return 'overdue'
    case 'return_completed':
      return 'return_completed'
    case 'rejected':
      return 'rejected'
    case 'cancelled':
      return 'cancelled'
  }
}
