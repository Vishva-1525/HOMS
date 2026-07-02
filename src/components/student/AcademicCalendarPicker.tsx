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
}: AcademicCalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const yearOptions = useMemo(() => buildYearOptions(year), [year])

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

  return (
    <div
      className={cn(
        'rounded-xl border border-white/55 bg-white/40 backdrop-blur-md',
        compact ? 'border-0 bg-transparent p-0' : 'p-4',
      )}
    >
      {!compact && (
        <p className="text-sm font-semibold text-slate-900">Academic calendar</p>
      )}

      <div className={cn('flex flex-wrap items-center justify-between gap-2', !compact && 'mt-3')}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1A5CA0]"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <select
            value={month}
            onChange={(e) => setMonthIndex(Number(e.target.value))}
            aria-label="Select month"
            className="h-8 min-w-[7rem] rounded-lg border border-white/60 bg-white/70 px-2 text-xs font-medium text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1A5CA0]"
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
            className="h-8 min-w-[5rem] rounded-lg border border-white/60 bg-white/70 px-2 text-xs font-medium text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1A5CA0]"
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
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1A5CA0]"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!compact && (
        <div className="mt-3 flex flex-wrap gap-2">
          {LEGEND_TYPES.map((type) => (
            <span
              key={type}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                ACADEMIC_DAY_STYLES[type],
              )}
            >
              {ACADEMIC_DAY_LABELS[type]}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <p className="dashboard-muted mt-4 text-center text-xs">Loading calendar…</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((dateKey, index) => {
              if (!dateKey) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }

              const dayType = getDayTypeForCell(dateKey, calendarMap)
              const selectable = isDateSelectableForOutpass(dateKey, calendarMap)
              const isSelected = selectedDateKey === dateKey
              const isToday = dateKey === toDateKey(new Date())
              const dayNum = parseDateKey(dateKey).getDate()
              const entry = calendarMap.get(dateKey) ?? days.find((d) => d.calendar_date === dateKey)

              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={!selectable || !onSelectDate}
                  title={entry?.label || ACADEMIC_DAY_LABELS[dayType]}
                  onClick={() => onSelectDate?.(dateKey)}
                  className={cn(
                    'aspect-square rounded-lg border text-xs font-semibold transition-all',
                    ACADEMIC_DAY_STYLES[dayType],
                    !selectable && 'cursor-not-allowed opacity-40',
                    isSelected && 'ring-2 ring-[#1A5CA0] ring-offset-1 shadow-sm',
                    isToday && !isSelected && 'ring-1 ring-[#1A5CA0]/40',
                    selectable && onSelectDate && 'hover:brightness-95 hover:shadow-sm',
                  )}
                >
                  {dayNum}
                </button>
              )
            })}
          </div>
          <p className="dashboard-muted mt-3 text-[11px]">
            {onSelectDate
              ? 'Tap a working day or study holiday to select your date.'
              : 'Select departure/return dates on working days or study holidays only.'}
          </p>
        </>
      )}
    </div>
  )
}
