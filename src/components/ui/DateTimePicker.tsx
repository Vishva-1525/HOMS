import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  isDateSelectableForOutpass,
  parseDateKey,
  toDateKey,
} from '@/lib/academic-calendar'
import {
  buildDatetimeLocal,
  formatTimeLabel,
  generateTimeSlots,
  isTimeWithinBounds,
  parseDatetimeLocal,
} from '@/lib/datetime-local'
import type { AcademicCalendarDay } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  error?: string
  hint?: string
  calendarMap: Map<string, AcademicCalendarDay>
  calendarLoading?: boolean
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function dateKeyInRange(dateKey: string, min?: string, max?: string): boolean {
  if (min && dateKey < min.slice(0, 10)) return false
  if (max && dateKey > max.slice(0, 10)) return false
  return true
}

export function DateTimePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  disabled,
  error,
  hint,
  calendarMap,
  calendarLoading,
}: DateTimePickerProps) {
  const parsed = parseDatetimeLocal(value)
  const selectedDateKey = parsed?.dateKey

  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDateKey) {
      const d = parseDateKey(selectedDateKey)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  useEffect(() => {
    if (!selectedDateKey) return
    const selected = parseDateKey(selectedDateKey)
    setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
  }, [selectedDateKey])

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(year, month, i + 1))),
  ]

  const timeSlots = useMemo(() => {
    if (!selectedDateKey) return []
    return generateTimeSlots(15).filter((slot) =>
      isTimeWithinBounds(selectedDateKey, slot.hours, slot.minutes, min, max),
    )
  }, [selectedDateKey, min, max])

  function shiftMonth(delta: number) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  function handleDateSelect(dateKey: string) {
    if (disabled) return
    const existing = parseDatetimeLocal(value)
    let hours = existing?.hours ?? 9
    let minutes = existing?.minutes ?? 0

    if (!isTimeWithinBounds(dateKey, hours, minutes, min, max)) {
      const first = generateTimeSlots(15).find((slot) =>
        isTimeWithinBounds(dateKey, slot.hours, slot.minutes, min, max),
      )
      if (!first) return
      hours = first.hours
      minutes = first.minutes
    }

    onChange(buildDatetimeLocal(dateKey, hours, minutes))
  }

  function handleTimeSelect(hours: number, minutes: number) {
    if (!selectedDateKey || disabled) return
    onChange(buildDatetimeLocal(selectedDateKey, hours, minutes))
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[#1A5CA0]" strokeWidth={1.75} aria-hidden />
        {label}
      </Label>

      {hint && <p className="text-xs leading-relaxed text-slate-600">{hint}</p>}

      <div
        className={cn(
          'rounded-xl border border-white/55 bg-white/50 p-3 shadow-sm backdrop-blur-md',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
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

        {calendarLoading ? (
          <p className="py-6 text-center text-xs text-slate-500">Loading calendar…</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d, i) => (
                <span
                  key={`${d}-${i}`}
                  className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  {d}
                </span>
              ))}
              {cells.map((dateKey, index) => {
                if (!dateKey) {
                  return <div key={`empty-${index}`} className="h-8" />
                }

                const selectable =
                  isDateSelectableForOutpass(dateKey, calendarMap) &&
                  dateKeyInRange(dateKey, min, max)
                const isSelected = selectedDateKey === dateKey
                const isToday = dateKey === toDateKey(new Date())
                const dayNum = parseDateKey(dateKey).getDate()

                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={!selectable}
                    aria-pressed={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => handleDateSelect(dateKey)}
                    className={cn(
                      'flex h-8 items-center justify-center rounded-md text-xs font-medium transition-colors',
                      isSelected && 'bg-[#1A5CA0] text-white shadow-sm',
                      !isSelected && selectable && 'text-slate-800 hover:bg-[#EBF3FF]',
                      !isSelected && !selectable && 'cursor-not-allowed text-slate-300',
                      isToday && !isSelected && selectable && 'ring-1 ring-[#1A5CA0]/40',
                    )}
                  >
                    {dayNum}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Working days and study holidays only.
            </p>
          </>
        )}

        <div className="mt-3 border-t border-slate-200/70 pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Time
          </p>

          {!selectedDateKey ? (
            <p className="rounded-lg border border-dashed border-slate-300/70 bg-slate-50/50 px-3 py-2.5 text-center text-xs text-slate-500">
              Select a date first
            </p>
          ) : timeSlots.length === 0 ? (
            <p className="rounded-lg border border-dashed border-amber-300/70 bg-amber-50/50 px-3 py-2.5 text-center text-xs text-amber-800">
              No available times for this date.
            </p>
          ) : (
            <div
              id={id}
              role="listbox"
              aria-label="Select time"
              className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {timeSlots.map((slot) => {
                const isSelected =
                  parsed?.hours === slot.hours && parsed?.minutes === slot.minutes
                return (
                  <button
                    key={`${slot.hours}-${slot.minutes}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleTimeSelect(slot.hours, slot.minutes)}
                    className={cn(
                      'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                      isSelected
                        ? 'bg-[#1A5CA0] text-white shadow-sm'
                        : 'bg-white/80 text-slate-700 ring-1 ring-slate-200/80 hover:bg-[#EBF3FF]',
                    )}
                  >
                    {formatTimeLabel(slot.hours, slot.minutes)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {value && parsed && (
          <p className="mt-2 text-center text-[11px] text-slate-600">
            {new Date(value).toLocaleString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-[#DC2626]">{error}</p>}
    </div>
  )
}
