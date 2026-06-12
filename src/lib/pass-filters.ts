import type { GateLog, OutpassRequest, OutpassStatus } from '@/lib/types'

export type PassFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'completed'

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
  return Date.now() > new Date(pass.return_by).getTime()
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

export function canRequestExtension(pass: OutpassRequest): boolean {
  if (pass.status !== 'approved' && pass.status !== 'extended') return false

  const returnBy = new Date(pass.return_by).getTime()
  const now = Date.now()
  const twoHoursMs = 2 * 60 * 60 * 1000

  return Math.abs(now - returnBy) <= twoHoursMs
}

export function isQrEligibleStatus(status: OutpassStatus): boolean {
  return status === 'approved' || status === 'extended'
}
