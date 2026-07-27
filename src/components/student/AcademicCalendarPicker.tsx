import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  ACADEMIC_DAY_LABELS,
  ACADEMIC_DAY_STYLES,
  isDateSelectableForOutpass,
  parseDateKey,
  toDateKey,
} from '@/lib/academic-calendar'
import type { AcademicCalendarDay, AcademicDayType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AcademicCalendarPickerProps {
  days: AcademicCalendarDay[]
  calendarMap: Map<string, AcademicCalendarDay>
  selectedDateKey?: string
  onSelectDate?: (dateKey: string) => void
  loading?: boolean
  compact?: boolean
  /** browse = inspect any day (warden); picker = outpass selectable days only */
  mode?: 'picker' | 'browse'
  /** glass = student DateTimePicker-style chrome (used on RT/warden home) */
  variant?: 'default' | 'glass'
  title?: string
  helperText?: string
}

const LEGEND_TYPES: AcademicDayType[] = [
  'working_day',
  'study_holiday',
  'holiday',
  'exam_day',
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const WEEKDAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function getDayTypeForCell(
  dateKey: string,
  calendarMap: Map<string, AcademicCalendarDay>,
): AcademicDayType {
  const entry = calendarMap.get(dateKey)
  if (entry) return entry.day_type
  const dow = parseDateKey(dateKey).getDay()
  return dow === 0 || dow === 6 ? 'holiday' : 'working_day'
}

function buildYearOptions(centerYear: number, span = 3): number[] {
  const years: number[] = []
  for (let y = centerYear - span; y <= centerYear + span; y++) {
    years.push(y)
  }
  return years
}

export function AcademicCalendarPicker({
  days,
  calendarMap,
  selectedDateKey,
  onSelectDate,
  loading,
  compact = false,
  mode = 'picker',
  variant = 'default',
  title = 'Academic calendar',
  helperText,
}: AcademicCalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const yearOptions = useMemo(() => buildYearOptions(year), [year])
  const browse = mode === 'browse'
  const glass = variant === 'glass'

  useEffect(() => {
    if (!selectedDateKey) return
    const selected = parseDateKey(selectedDateKey)
    setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
  }, [selectedDateKey])

  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(year, month, i + 1))),
  ]

  function shiftMonth(delta: number) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  function setMonthIndex(nextMonth: number) {
    setViewMonth((prev) => new Date(prev.getFullYear(), nextMonth, 1))
  }

  function setYear(nextYear: number) {
    setViewMonth((prev) => new Date(nextYear, prev.getMonth(), 1))
  }

  const resolvedHelper =
    helperText ??
    (browse
      ? 'Tap a date to inspect holidays and working days.'
      : onSelectDate
        ? 'Tap a working day or study holiday to select your date.'
        : 'Select departure/return dates on working days or study holidays only.')

  return (
    <div className={cn(!glass && (compact ? 'p-0' : 'academic-calendar-panel'), glass && 'p-0')}>
      {!compact && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={cn(
                glass
                  ? 'text-sm font-semibold text-slate-900'
                  : 'dashboard-heading text-base sm:text-lg',
              )}
            >
              {title}
            </p>
            {!glass && (
              <p className="dashboard-muted mt-1 text-xs font-medium leading-relaxed sm:text-sm">
                {MONTH_NAMES[month]} {year}
              </p>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2',
          !compact && 'mt-4',
          glass && 'mb-2 mt-3',
        )}
      >
        {glass ? (
          <div className="flex w-full items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-[#EBF3FF]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-slate-900">
              {MONTH_NAMES_SHORT[month]} {year}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-[#EBF3FF]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="academic-calendar-nav-btn"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <select
              value={month}
              onChange={(e) => setMonthIndex(Number(e.target.value))}
              aria-label="Select month"
              className="academic-calendar-select min-w-[8rem] text-[13px]"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="Select year"
              className="academic-calendar-select min-w-[5.5rem] text-[13px]"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="academic-calendar-nav-btn"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {!compact && !glass && (
        <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
          {LEGEND_TYPES.map((type) => (
            <span
              key={type}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide sm:text-[11px]',
                ACADEMIC_DAY_STYLES[type],
              )}
            >
              {ACADEMIC_DAY_LABELS[type]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1A5CA0]/35 bg-[#EBF3FF] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#0D3F72] sm:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1A5CA0]" aria-hidden />
            Today
          </span>
        </div>
      )}

      {glass && (
        <div className="mb-2 flex flex-wrap gap-1">
          {LEGEND_TYPES.map((type) => (
            <span
              key={type}
              className={cn(
                'rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide',
                ACADEMIC_DAY_STYLES[type],
              )}
            >
              {ACADEMIC_DAY_LABELS[type]}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <p className={cn('mt-4 text-center text-xs', glass ? 'text-slate-500' : 'dashboard-muted')}>
          Loading calendar…
        </p>
      ) : (
        <>
          <div className={cn('grid grid-cols-7', glass ? 'gap-0.5' : 'mt-4 gap-1 sm:gap-1.5')}>
            {(glass ? WEEKDAYS_SHORT : WEEKDAYS_FULL).map((d, i) => (
              <span
                key={`${d}-${i}`}
                className={
                  glass
                    ? 'py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400'
                    : 'academic-calendar-weekday'
                }
              >
                {d}
              </span>
            ))}
            {cells.map((dateKey, index) => {
              if (!dateKey) {
                return (
                  <div
                    key={`empty-${index}`}
                    className={glass ? 'h-8' : 'aspect-square'}
                  />
                )
              }

              const dayType = getDayTypeForCell(dateKey, calendarMap)
              const selectable = browse || isDateSelectableForOutpass(dateKey, calendarMap)
              const canInteract = Boolean(onSelectDate) && (browse || selectable)
              const isSelected = selectedDateKey === dateKey
              const isToday = dateKey === toDateKey(new Date())
              const dayNum = parseDateKey(dateKey).getDate()
              const entry = calendarMap.get(dateKey) ?? days.find((d) => d.calendar_date === dateKey)

              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={!canInteract}
                  title={entry?.label || ACADEMIC_DAY_LABELS[dayType]}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isSelected}
                  onClick={() => onSelectDate?.(dateKey)}
                  className={cn(
                    glass
                      ? 'flex h-8 items-center justify-center rounded-md text-xs font-medium transition-colors'
                      : 'academic-calendar-day',
                    !isSelected && ACADEMIC_DAY_STYLES[dayType],
                    glass && isSelected && 'bg-[#1A5CA0] text-white shadow-sm',
                    !glass && isSelected && 'academic-calendar-day-selected',
                    isToday &&
                      !isSelected &&
                      (glass ? 'ring-1 ring-[#1A5CA0]/40' : 'academic-calendar-day-today'),
                    !canInteract && 'cursor-not-allowed opacity-35 grayscale',
                    !glass &&
                      canInteract &&
                      !isSelected &&
                      'hover:-translate-y-0.5 hover:shadow-md hover:brightness-[0.98] active:translate-y-0 active:scale-[0.97]',
                    glass && canInteract && !isSelected && 'hover:brightness-[0.97]',
                  )}
                >
                  {dayNum}
                </button>
              )
            })}
          </div>
          <p
            className={cn(
              'mt-2 text-[11px] leading-relaxed',
              glass ? 'text-slate-500' : 'dashboard-muted mt-4 sm:text-xs',
            )}
          >
            {resolvedHelper}
          </p>
        </>
      )}
    </div>
  )
}
