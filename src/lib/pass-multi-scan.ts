import type { GateLog, OutpassRequest } from '@/lib/types'
import { hasEntryLog } from '@/lib/pass-filters'
import { isPassActive } from '@/lib/outpass'

/** Internship (and any pass flagged in DB) allows repeated exit/entry until return_by. */
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

function istDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export function getTodayIstDateKey(now = new Date()): string {
  return istDateKey(now)
}

export function hasGateEventOnIstDay(
  gateLogs: GateLog[],
  eventType: 'exit' | 'entry',
  dayKey = getTodayIstDateKey(),
): boolean {
  return gateLogs.some(
    (log) => log.event_type === eventType && istDateKey(log.scanned_at) === dayKey,
  )
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

/** Single-use pass: completed after entry. Internship: completed after return_by. */
export function isPassTripComplete(pass: OutpassRequest, gateLogs: GateLog[]): boolean {
  if (isMultiDailyScanPass(pass)) {
    return Date.now() > new Date(pass.return_by).getTime()
  }
  return hasEntryLog(pass.id, gateLogs)
}

/** Latest gate event is exit while the pass is still active. */
export function isStudentCurrentlyOutside(
  pass: OutpassRequest,
  gateLogs: GateLog[],
): boolean {
  if (!isPassActive(pass) && pass.status !== 'approved' && pass.status !== 'extended') {
    return false
  }
  if (pass.status !== 'approved' && pass.status !== 'extended') return false

  const latest = getLatestGateEvent(getPassGateLogs(pass.id, gateLogs))
  if (latest?.event_type !== 'exit') return false

  if (isMultiDailyScanPass(pass)) {
    return isPassWithinValidityWindow(pass)
  }

  return !hasEntryLog(pass.id, gateLogs)
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
    if (!isMultiDailyScanPass(pass) && hasEntryLog(pass.id, gateLogs)) continue
    if (isStudentCurrentlyOutside(pass, gateLogs)) {
      return { ...pass, isCheckedOut: true }
    }
  }
  return null
}
