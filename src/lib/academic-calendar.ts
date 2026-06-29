import type { AcademicCalendarDay, AcademicDayType } from '@/lib/types'

export const ACADEMIC_DAY_LABELS: Record<AcademicDayType, string> = {
  holiday: 'Holiday',
  working_day: 'Working Day',
  exam_day: 'Exam Day',
  study_holiday: 'Study Holiday',
}

export const ACADEMIC_DAY_STYLES: Record<AcademicDayType, string> = {
  holiday: 'bg-red-100 text-red-800 border-red-200',
  working_day: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  exam_day: 'bg-amber-100 text-amber-900 border-amber-200',
  study_holiday: 'bg-sky-100 text-sky-800 border-sky-200',
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
