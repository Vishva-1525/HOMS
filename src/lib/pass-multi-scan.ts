import type { GateLog, OutpassRequest } from '@/lib/types'
import {
  getLatestPassLog,
  getNextCheckpoint,
  hasCheckpoint,
  isCheckpointCycleComplete,
  isOutsideCampus,
  isTripInProgress,
} from '@/lib/gate-checkpoints'
import { isPassActive } from '@/lib/outpass'

/** Internship (and any pass flagged in DB) allows repeated daily 4-scan cycles until return_by. */
export function isMultiDailyScanPass(
  pass: Pick<OutpassRequest, 'allows_multi_daily_scan' | 'special_purpose'>,
): boolean {
  if (pass.allows_multi_daily_scan === true) return true
  return pass.special_purpose === 'internship'
}

export function getPassGateLogs(passId: string, gateLogs: GateLog[]): GateLog[] {
  return gateLogs.filter((log) => log.outpass_id === passId)
}

export function getLatestGateEvent(gateLogs: GateLog[]): GateLog | null {
  if (gateLogs.length === 0) return null
  return [...gateLogs].sort(
    (a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime(),
  )[0] ?? null
}

/** True when the QR is within its backend validity window. */
export function isPassWithinValidityWindow(
  pass: Pick<OutpassRequest, 'departure_at' | 'return_by'>,
  now = Date.now(),
): boolean {
  return (
    now >= new Date(pass.departure_at).getTime()
    && now <= new Date(pass.return_by).getTime()
  )
}

export function isInternshipQrExpired(
  pass: Pick<OutpassRequest, 'allows_multi_daily_scan' | 'special_purpose' | 'return_by'>,
  now = Date.now(),
): boolean {
  if (!isMultiDailyScanPass(pass)) return false
  return now > new Date(pass.return_by).getTime()
}

/** Single-use: completed after hostel entry. Internship: completed after return_by. */
export function isPassTripComplete(pass: OutpassRequest, gateLogs: GateLog[]): boolean {
  if (isMultiDailyScanPass(pass)) {
    return Date.now() > new Date(pass.return_by).getTime()
  }
  return isCheckpointCycleComplete(pass.id, gateLogs)
}

/**
 * Student is mid-trip (left hostel, not yet back at hostel).
 * Internship: only within validity window for today's incomplete cycle.
 */
export function isStudentCurrentlyOutside(
  pass: OutpassRequest,
  gateLogs: GateLog[],
): boolean {
  if (pass.status !== 'approved' && pass.status !== 'extended') return false

  const multi = isMultiDailyScanPass(pass)
  if (!isTripInProgress(pass.id, gateLogs, { multiDaily: multi })) return false

  if (multi) {
    return isPassWithinValidityWindow(pass)
  }

  return true
}

/** True when past main gate exit and not yet main gate entry (off campus). */
export function isStudentOffCampus(pass: OutpassRequest, gateLogs: GateLog[]): boolean {
  if (pass.status !== 'approved' && pass.status !== 'extended') return false
  const multi = isMultiDailyScanPass(pass)
  if (!isOutsideCampus(pass.id, gateLogs, { multiDaily: multi })) return false
  if (multi) return isPassWithinValidityWindow(pass)
  return true
}

/** Active pass banner: show QR until trip completes (or internship expires). */
export function findActivePassForBanner(
  passes: OutpassRequest[],
  gateLogs: GateLog[],
): OutpassRequest | null {
  const active = passes.find(isPassActive) ?? null
  if (!active) return null
  if (isPassTripComplete(active, gateLogs)) return null
  return active
}

export interface ActiveCheckedOutPass extends OutpassRequest {
  isCheckedOut: true
}

export function findCheckedOutPass(
  passes: OutpassRequest[],
  gateLogs: GateLog[],
): ActiveCheckedOutPass | null {
  for (const pass of passes.filter(isPassActive)) {
    if (isStudentCurrentlyOutside(pass, gateLogs)) {
      return { ...pass, isCheckedOut: true }
    }
  }
  return null
}

export function getNextScanCheckpoint(pass: OutpassRequest, gateLogs: GateLog[]) {
  return getNextCheckpoint(pass.id, gateLogs, {
    multiDaily: isMultiDailyScanPass(pass),
  })
}

export function hasHostelEntry(
  passId: string,
  gateLogs: GateLog[],
  multiDaily = false,
): boolean {
  return hasCheckpoint(passId, gateLogs, 'hostel_entry', { multiDaily })
}

export { getLatestPassLog }
