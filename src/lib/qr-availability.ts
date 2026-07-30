import type { OutpassRequest } from '@/lib/types'
import { isMultiDailyScanPass, isPassWithinValidityWindow } from '@/lib/pass-multi-scan'

/** Default: QR unlocks this many minutes before departure (also in system_settings). */
export const DEFAULT_QR_AVAILABILITY_MINUTES = 30

export function parseQrAvailabilityMinutes(value: string | undefined | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_QR_AVAILABILITY_MINUTES
  return Math.floor(parsed)
}

export function getQrAvailabilityOpensAt(pass: OutpassRequest, windowMinutes: number): Date {
  const departure = new Date(pass.departure_at).getTime()
  return new Date(departure - windowMinutes * 60_000)
}

export function isQrAvailable(pass: OutpassRequest, windowMinutes: number, now = Date.now()): boolean {
  if (pass.status !== 'approved' && pass.status !== 'extended') return false
  if (now > new Date(pass.return_by).getTime()) return false

  if (isMultiDailyScanPass(pass)) {
    // Internship QR is usable for the full validity window once approved.
    return now <= new Date(pass.return_by).getTime()
  }

  return now >= getQrAvailabilityOpensAt(pass, windowMinutes).getTime()
}

/** Milliseconds until QR unlocks; 0 if already available or not applicable. */
export function getMsUntilQrUnlock(
  pass: OutpassRequest,
  windowMinutes: number,
  now = Date.now(),
): number {
  if (isMultiDailyScanPass(pass)) return 0
  if (pass.status !== 'approved' && pass.status !== 'extended') return 0
  const opensAt = getQrAvailabilityOpensAt(pass, windowMinutes).getTime()
  return Math.max(0, opensAt - now)
}

export function formatCountdownDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatQrAvailabilityMessage(windowMinutes = DEFAULT_QR_AVAILABILITY_MINUTES): string {
  return `QR unlocks ${windowMinutes} minute${windowMinutes === 1 ? '' : 's'} before departure.`
}

export function formatQrOpensAt(pass: OutpassRequest, windowMinutes: number): string {
  return getQrAvailabilityOpensAt(pass, windowMinutes).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isWithinDepartureWindow(pass: OutpassRequest, now = Date.now()): boolean {
  if (isMultiDailyScanPass(pass)) {
    return isPassWithinValidityWindow(pass, now)
  }
  return now >= new Date(pass.departure_at).getTime()
}
