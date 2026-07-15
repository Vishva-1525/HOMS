/** Helpers for HTML datetime-local values (YYYY-MM-DDTHH:mm). */

export interface ParsedDatetimeLocal {
  dateKey: string
  hours: number
  minutes: number
}

export function parseDatetimeLocal(value: string): ParsedDatetimeLocal | null {
  if (!value) return null
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return null
  const [hours, minutes] = timePart.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return { dateKey: datePart, hours, minutes }
}

export function buildDatetimeLocal(dateKey: string, hours: number, minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dateKey}T${pad(hours)}:${pad(minutes)}`
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** datetime-local floor for "now" so past slots cannot be selected. */
export function toDatetimeLocalNow(): string {
  return toDatetimeLocalValue(new Date())
}

export function formatTimeLabel(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 || 12
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`
}

export function generateTimeSlots(intervalMinutes = 15): { hours: number; minutes: number }[] {
  const slots: { hours: number; minutes: number }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      slots.push({ hours: h, minutes: m })
    }
  }
  return slots
}

export function isTimeWithinBounds(
  dateKey: string,
  hours: number,
  minutes: number,
  min?: string,
  max?: string,
): boolean {
  const value = buildDatetimeLocal(dateKey, hours, minutes)
  if (min && value < min) return false
  if (max && value > max) return false
  return true
}
