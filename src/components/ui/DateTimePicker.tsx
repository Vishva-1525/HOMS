import { Calendar } from 'lucide-react'
import { AcademicCalendarPicker } from '@/components/student/AcademicCalendarPicker'
import { TimeScrollPicker } from '@/components/ui/TimeScrollPicker'
import { Label } from '@/components/ui/label'
import {
  buildDatetimeLocal,
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
  calendarDays: AcademicCalendarDay[]
  calendarMap: Map<string, AcademicCalendarDay>
  calendarLoading?: boolean
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
  calendarDays,
  calendarMap,
  calendarLoading,
}: DateTimePickerProps) {
  const parsed = parseDatetimeLocal(value)
  const selectedDateKey = parsed?.dateKey

  function handleDateSelect(dateKey: string) {
    const existing = parseDatetimeLocal(value)
    const hours = existing?.hours ?? 9
    const minutes = existing?.minutes ?? 0
    onChange(buildDatetimeLocal(dateKey, hours, minutes))
  }

  return (
    <div className="space-y-3">
      <Label htmlFor={id} className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[#1A5CA0]" strokeWidth={1.75} aria-hidden />
        {label}
      </Label>

      <div
        className={cn(
          'space-y-4 rounded-xl border border-white/55 bg-white/35 p-4 backdrop-blur-md',
          disabled && 'opacity-50',
        )}
      >
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">Date</p>
          <AcademicCalendarPicker
            days={calendarDays}
            calendarMap={calendarMap}
            selectedDateKey={selectedDateKey}
            onSelectDate={disabled ? undefined : handleDateSelect}
            loading={calendarLoading}
            compact
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">Time</p>
          <TimeScrollPicker
            id={id}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            disabled={disabled}
          />
        </div>

        {selectedDateKey && parsed && (
          <p className="text-center text-xs text-slate-600">
            Selected:{' '}
            <span className="font-medium text-slate-900">
              {new Date(value).toLocaleString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </p>
        )}
      </div>

      {error && <p className="text-sm text-[#DC2626]">{error}</p>}
    </div>
  )
}
