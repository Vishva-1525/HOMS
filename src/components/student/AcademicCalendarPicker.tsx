import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
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
}

const LEGEND_TYPES: AcademicDayType[] = [
  'working_day',
  'study_holiday',
  'holiday',
  'exam_day',
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

export function AcademicCalendarPicker({
  days,
  calendarMap,
  selectedDateKey,
  onSelectDate,
  loading,
}: AcademicCalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const monthLabel = viewMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(year, month, i + 1))),
  ]

  function shiftMonth(delta: number) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  return (
    <div className="rounded-xl border border-white/55 bg-white/40 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Academic calendar</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md p-1 text-slate-600 hover:bg-white/50"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[9rem] text-center text-xs font-medium text-slate-700">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-md p-1 text-slate-600 hover:bg-white/50"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

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

      {loading ? (
        <p className="dashboard-muted mt-4 text-center text-xs">Loading calendar…</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-500">
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
                    'aspect-square rounded-lg border text-xs font-medium transition-colors',
                    ACADEMIC_DAY_STYLES[dayType],
                    !selectable && 'cursor-not-allowed opacity-45',
                    isSelected && 'ring-2 ring-[#1A5CA0] ring-offset-1',
                    selectable && onSelectDate && 'hover:brightness-95',
                  )}
                >
                  {dayNum}
                </button>
              )
            })}
          </div>
          <p className="dashboard-muted mt-3 text-[11px]">
            Select departure/return dates on working days or study holidays only.
          </p>
        </>
      )}
    </div>
  )
}
