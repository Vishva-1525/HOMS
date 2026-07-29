import type { GateLog, OutpassRequest } from '@/lib/types'

/** Internship (and any pass flagged in DB) allows repeated exit/entry until return_by. */
export function isMultiDailyScanPass(
  pass: Pick<OutpassRequest, 'allows_multi_daily_scan' | 'special_purpose'>,
): boolean {
  if (pass.allows_multi_daily_scan === true) return true
  return pass.special_purpose === 'internship'
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
