import { useEffect, useRef } from 'react'
import {
  buildDatetimeLocal,
  formatTimeLabel,
  generateTimeSlots,
  isTimeWithinBounds,
  parseDatetimeLocal,
} from '@/lib/datetime-local'
import { cn } from '@/lib/utils'

interface TimeScrollPickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  id?: string
}

export function TimeScrollPicker({
  value,
  onChange,
  min,
  max,
  disabled,
  id,
}: TimeScrollPickerProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const parsed = parseDatetimeLocal(value)
  const dateKey = parsed?.dateKey ?? ''
  const selectedHours = parsed?.hours ?? 0
  const selectedMinutes = parsed?.minutes ?? 0

  const slots = generateTimeSlots(15).filter((slot) =>
    dateKey ? isTimeWithinBounds(dateKey, slot.hours, slot.minutes, min, max) : true,
  )

  const selectedKey = `${selectedHours}:${selectedMinutes}`

  useEffect(() => {
    const container = listRef.current
    if (!container) return
    const active = container.querySelector('[data-selected="true"]')
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [selectedKey, dateKey])

  function selectTime(hours: number, minutes: number) {
    if (!dateKey || disabled) return
    onChange(buildDatetimeLocal(dateKey, hours, minutes))
  }

  if (!dateKey) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/60 px-3 py-4 text-center text-xs text-slate-500">
        Select a date first to choose a time
      </p>
    )
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/60 px-3 py-4 text-center text-xs text-amber-800">
        No available times for this date within the allowed range.
      </p>
    )
  }

  return (
    <div
      id={id}
      ref={listRef}
      role="listbox"
      aria-label="Select time"
      className={cn(
        'time-scroll-picker max-h-44 overflow-y-auto overscroll-contain scroll-smooth rounded-xl border border-white/55 bg-white/50 p-1 shadow-sm backdrop-blur-md',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {slots.map((slot) => {
        const isSelected = slot.hours === selectedHours && slot.minutes === selectedMinutes
        return (
          <button
            key={`${slot.hours}-${slot.minutes}`}
            type="button"
            role="option"
            aria-selected={isSelected}
            data-selected={isSelected ? 'true' : 'false'}
            onClick={() => selectTime(slot.hours, slot.minutes)}
            className={cn(
              'flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isSelected
                ? 'bg-[#1A5CA0] text-white shadow-sm'
                : 'text-slate-700 hover:bg-[#EBF3FF]/80',
            )}
          >
            {formatTimeLabel(slot.hours, slot.minutes)}
          </button>
        )
      })}
    </div>
  )
}
