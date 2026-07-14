import type { AcademicCalendarDay, AcademicDayType } from '@/lib/types'

export const ACADEMIC_DAY_LABELS: Record<AcademicDayType, string> = {
  holiday: 'Holiday',
  working_day: 'Working Day',
  exam_day: 'Exam Day',
  study_holiday: 'Study Holiday',
}

export const ACADEMIC_DAY_STYLES: Record<AcademicDayType, string> = {
  holiday:
    'bg-red-100 text-red-900 border-red-300/80 hover:border-red-400 dark:bg-red-950/55 dark:text-red-100 dark:border-red-800/50',
  working_day:
    'bg-emerald-50 text-emerald-950 border-emerald-300/70 hover:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800/45',
  exam_day:
    'bg-amber-100 text-amber-950 border-amber-400/70 hover:border-amber-500 dark:bg-amber-950/45 dark:text-amber-100 dark:border-amber-700/50',
  study_holiday:
    'bg-sky-100 text-sky-950 border-sky-300/80 hover:border-sky-400 dark:bg-sky-950/45 dark:text-sky-100 dark:border-sky-800/50',
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function buildCalendarMap(days: AcademicCalendarDay[]): Map<string, AcademicCalendarDay> {
  return new Map(days.map((day) => [day.calendar_date, day]))
}

/** Students may request outpass on working days and study holidays. */
export function isDateSelectableForOutpass(
  dateKey: string,
  calendarMap: Map<string, AcademicCalendarDay>,
): boolean {
  const entry = calendarMap.get(dateKey)
  if (!entry) {
    const date = parseDateKey(dateKey)
    const dow = date.getDay()
    return dow !== 0 && dow !== 6
  }
  return entry.day_type === 'working_day' || entry.day_type === 'study_holiday'
}

export function getDateRestrictionMessage(
  dateKey: string,
  calendarMap: Map<string, AcademicCalendarDay>,
): string | null {
  const entry = calendarMap.get(dateKey)
  if (!entry) {
    const date = parseDateKey(dateKey)
    const dow = date.getDay()
    if (dow === 0 || dow === 6) return 'Weekends are not available for outpass requests.'
    return null
  }
  if (entry.day_type === 'holiday') {
    return entry.label ? `${entry.label} — holidays are blocked.` : 'This date is a holiday.'
  }
  if (entry.day_type === 'exam_day') {
    return entry.label ? `${entry.label} — exam days are blocked.` : 'This date is an exam day.'
  }
  return null
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return { start: toDateKey(start), end: toDateKey(end) }
}
