import { useMemo, useState } from 'react'
import { AcademicCalendarPicker } from '@/components/student/AcademicCalendarPicker'
import { useAcademicCalendar } from '@/hooks/useAcademicCalendar'
import {
  ACADEMIC_DAY_LABELS,
  ACADEMIC_DAY_STYLES,
  parseDateKey,
  toDateKey,
} from '@/lib/academic-calendar'
import type { AcademicCalendarDay, AcademicDayType } from '@/lib/types'
import { cn } from '@/lib/utils'

function resolveDayType(
  dateKey: string,
  calendarMap: Map<string, AcademicCalendarDay>,
): AcademicDayType {
  const entry = calendarMap.get(dateKey)
  if (entry) return entry.day_type
  const dow = parseDateKey(dateKey).getDay()
  return dow === 0 || dow === 6 ? 'holiday' : 'working_day'
}

export function WardenCalendarPanel() {
  const { days, calendarMap, loading, error } = useAcademicCalendar()
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()))

  const selectedMeta = useMemo(() => {
    const entry = calendarMap.get(selectedDateKey)
    const dayType = resolveDayType(selectedDateKey, calendarMap)
    const date = parseDateKey(selectedDateKey)
    return {
      dayType,
      label: entry?.label?.trim() || ACADEMIC_DAY_LABELS[dayType],
      formatted: date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      isToday: selectedDateKey === toDateKey(new Date()),
    }
  }, [calendarMap, selectedDateKey])

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#991B1B]">
          {error}
        </p>
      )}

      <AcademicCalendarPicker
        days={days}
        calendarMap={calendarMap}
        selectedDateKey={selectedDateKey}
        onSelectDate={setSelectedDateKey}
        loading={loading}
        mode="browse"
        title="Academic calendar"
        helperText="Today has a blue ring and marker. Selected dates use the primary highlight. Day types are color-coded."
      />

      <div
        className={cn(
          'flex items-start justify-between gap-3 rounded-2xl border px-3.5 py-3 shadow-sm',
          ACADEMIC_DAY_STYLES[selectedMeta.dayType],
        )}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
            {selectedMeta.isToday ? 'Today' : 'Selected date'}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">{selectedMeta.formatted}</p>
          <p className="mt-0.5 truncate text-xs opacity-90">{selectedMeta.label}</p>
        </div>
        <span className="shrink-0 rounded-full border border-current/20 bg-white/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide dark:bg-black/20">
          {ACADEMIC_DAY_LABELS[selectedMeta.dayType]}
        </span>
      </div>
    </div>
  )
}
