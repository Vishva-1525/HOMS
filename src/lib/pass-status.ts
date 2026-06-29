import type { GateLog, OutpassRequest } from '@/lib/types'
import type { StatusBadgeStatus } from '@/components/ui/StatusBadge'
import {
  PASS_CLASSIFICATION_LABELS,
  classifyPass,
  classificationToBadgeStatus,
} from '@/lib/pass-classification'

export function getPassDisplayStatus(
  pass: OutpassRequest,
  gateLogs: GateLog[] = [],
): StatusBadgeStatus {
  return classificationToBadgeStatus(classifyPass(pass, gateLogs))
}

export function getPassStatusLabel(
  status: OutpassRequest['status'],
  gateLogs: GateLog[],
  pass: OutpassRequest,
): string {
  const classification = classifyPass(pass, gateLogs)
  if (classification === 'approved' && status === 'extended') return 'Extended'
  return PASS_CLASSIFICATION_LABELS[classification]
}
