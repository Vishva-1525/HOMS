import type { OutpassRequest } from '@/lib/types'

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
  return now >= getQrAvailabilityOpensAt(pass, windowMinutes).getTime()
}

export function formatQrAvailabilityMessage(): string {
  return 'QR will be available before departure.'
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
  return now >= new Date(pass.departure_at).getTime()
}
