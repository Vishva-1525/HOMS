import type { ExtensionRequest, GateLog, OutpassRequest, OutpassStatus } from '@/lib/types'

export type PassFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'completed'

/** Late return past return_by by 12+ hours triggers extension / warden checks. */
export const SEVERE_OVERDUE_MS = 12 * 60 * 60 * 1000

export const PASS_FILTERS: { id: PassFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'completed', label: 'Completed' },
]

export function hasEntryLog(passId: string, gateLogs: GateLog[]): boolean {
  return gateLogs.some((log) => log.outpass_id === passId && log.event_type === 'entry')
}

export function isPassOverdue(pass: OutpassRequest, gateLogs: GateLog[]): boolean {
  if (pass.status !== 'approved' && pass.status !== 'extended') return false
  if (hasEntryLog(pass.id, gateLogs)) return false
  return getReturnOverdueMs(pass) > 0
}

export function getReturnOverdueMs(pass: OutpassRequest, at = Date.now()): number {
  return Math.max(0, at - new Date(pass.return_by).getTime())
}

export function formatOverdueDuration(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remHours = hours % 24
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
  }
  if (hours >= 1) return `${hours}h`
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)))
  return `${minutes}m`
}

export type EntryScanKind = 'valid' | 'late-entry' | 'overdue-entry'

export function evaluateEntryScan(
  pass: OutpassRequest,
  extensions: ExtensionRequest[],
): {
  kind: EntryScanKind
  extensionApproved: boolean
  extensionPending: boolean
  overdueMs: number
  requiresWardenAlert: boolean
} {
  const overdueMs = getReturnOverdueMs(pass)
  const extensionApproved = pass.status === 'extended'
    && extensions.some((e) => e.status === 'approved')
  const extensionPending = extensions.some((e) => e.status === 'pending')

  if (overdueMs === 0) {
    return {
      kind: 'valid',
      extensionApproved,
      extensionPending: false,
      overdueMs: 0,
      requiresWardenAlert: false,
    }
  }

  if (overdueMs < SEVERE_OVERDUE_MS) {
    return {
      kind: 'late-entry',
      extensionApproved: false,
      extensionPending,
      overdueMs,
      requiresWardenAlert: false,
    }
  }

  return {
    kind: 'overdue-entry',
    extensionApproved: false,
    extensionPending,
    overdueMs,
    requiresWardenAlert: true,
  }
}

export function isPassCompleted(pass: OutpassRequest, gateLogs: GateLog[]): boolean {
  if (pass.status === 'cancelled') return true
  return hasEntryLog(pass.id, gateLogs)
}

export function filterPasses(
  passes: OutpassRequest[],
  filter: PassFilter,
  gateLogs: GateLog[],
): OutpassRequest[] {
  switch (filter) {
    case 'all':
      return passes
    case 'pending':
      return passes.filter((p) => p.status === 'pending')
    case 'approved':
      return passes.filter((p) => p.status === 'approved' || p.status === 'extended')
    case 'rejected':
      return passes.filter((p) => p.status === 'rejected')
    case 'completed':
      return passes.filter((p) => isPassCompleted(p, gateLogs))
  }
}

export function canRequestExtension(
  pass: OutpassRequest,
  gateLogs: GateLog[] = [],
): boolean {
  if (pass.status !== 'approved') return false
  if (hasEntryLog(pass.id, gateLogs)) return false
  return Date.now() < new Date(pass.return_by).getTime()
}

export function isQrEligibleStatus(status: OutpassStatus): boolean {
  return status === 'approved' || status === 'extended'
}
