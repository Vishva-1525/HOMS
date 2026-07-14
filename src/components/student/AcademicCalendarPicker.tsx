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
    <div className={cn(compact ? 'p-0' : 'academic-calendar-panel')}>
      {!compact && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="dashboard-heading text-base sm:text-lg">{title}</p>
            <p className="dashboard-muted mt-1 text-xs font-medium leading-relaxed sm:text-sm">
              {MONTH_NAMES[month]} {year}
            </p>
          </div>
        </div>
      )}

      <div className={cn('flex flex-wrap items-center justify-between gap-2', !compact && 'mt-4')}>
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
      </div>

      {!compact && (
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

      {loading ? (
        <p className="dashboard-muted mt-4 text-center text-xs">Loading calendar…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-1.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d} className="academic-calendar-weekday">
                {d}
              </span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-1.5">
            {cells.map((dateKey, index) => {
              if (!dateKey) {
                return <div key={`empty-${index}`} className="aspect-square" />
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
                    'academic-calendar-day',
                    !isSelected && ACADEMIC_DAY_STYLES[dayType],
                    isSelected && 'academic-calendar-day-selected',
                    isToday && 'academic-calendar-day-today',
                    !canInteract && 'cursor-not-allowed opacity-35 grayscale',
                    canInteract &&
                      !isSelected &&
                      'hover:-translate-y-0.5 hover:shadow-md hover:brightness-[0.98] active:translate-y-0 active:scale-[0.97]',
                  )}
                >
                  {dayNum}
                </button>
              )
            })}
          </div>
          <p className="dashboard-muted mt-4 text-[11px] leading-relaxed sm:text-xs">{resolvedHelper}</p>
        </>
      )}
    </div>
  )
}
