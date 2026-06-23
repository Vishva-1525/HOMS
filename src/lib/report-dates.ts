export type ReportPeriod = 'daily' | 'weekly' | 'monthly'

export interface DateRange {
  start: Date
  end: Date
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function getDailyRange(reference = new Date()): DateRange {
  return { start: startOfDay(reference), end: endOfDay(reference) }
}

export function getWeeklyRange(reference = new Date()): DateRange {
  const day = reference.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(reference)
  monday.setDate(reference.getDate() + diffToMonday)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return { start: startOfDay(monday), end: endOfDay(sunday) }
}

export function getMonthlyRange(reference = new Date()): DateRange {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)
  return { start: startOfDay(start), end: endOfDay(end) }
}

export function getRangeForPeriod(period: ReportPeriod, reference = new Date()): DateRange {
  switch (period) {
    case 'daily':
      return getDailyRange(reference)
    case 'weekly':
      return getWeeklyRange(reference)
    case 'monthly':
      return getMonthlyRange(reference)
  }
}

export function getCustomRange(from: string, to: string): DateRange | null {
  if (!from || !to) return null
  const start = startOfDay(new Date(from))
  const end = endOfDay(new Date(to))
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  if (start > end) return null
  return { start, end }
}

export function isWithinRange(isoDate: string, range: DateRange): boolean {
  const time = new Date(isoDate).getTime()
  return time >= range.start.getTime() && time <= range.end.getTime()
}

export function formatRangeLabel(range: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const start = range.start.toLocaleDateString('en-IN', opts)
  const end = range.end.toLocaleDateString('en-IN', opts)
  if (start === end) return start
  return `${start} – ${end}`
}

export function formatFilenameDate(reference = new Date()): string {
  const y = reference.getFullYear()
  const m = String(reference.getMonth() + 1).padStart(2, '0')
  const d = String(reference.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatWeeklyTabLabel(range: DateRange): string {
  const startOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const endOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const start = range.start.toLocaleDateString('en-IN', startOpts)
  const end = range.end.toLocaleDateString('en-IN', endOpts)
  return `${start}–${end}`
}

export function formatMonthlyTabLabel(reference = new Date()): string {
  return reference.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function formatDailyTabLabel(reference = new Date()): string {
  return reference.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function reportTypeLabel(tab: ReportPeriod | 'custom'): string {
  switch (tab) {
    case 'daily':
      return 'Daily'
    case 'weekly':
      return 'Weekly'
    case 'monthly':
      return 'Monthly'
    case 'custom':
      return 'Custom'
  }
}
