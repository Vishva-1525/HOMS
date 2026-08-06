import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  availableHolidayYears,
  buildHolidayMap,
  isWeekend,
  parseDateKey,
  toDateKey,
  type PublicHoliday,
} from '@/lib/india-holidays'
import { cn } from '@/lib/utils'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dayMeta(dateKey: string, holidayMap: Map<string, PublicHoliday>) {
  const holiday = holidayMap.get(dateKey) ?? null
  const weekend = isWeekend(dateKey)
  return {
    holiday,
    weekend,
    isOff: Boolean(holiday) || weekend,
  }
}

/** Month/year holiday calendar (weekends + India / Tamil Nadu public holidays). */
export function HolidayCalendarPanel({ className }: { className?: string }) {
  const todayKey = toDateKey(new Date())
  const years = useMemo(() => availableHolidayYears(), [])
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [selectedKey, setSelectedKey] = useState(todayKey)

  const holidayMap = useMemo(() => buildHolidayMap(year), [year])

  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(year, month, i + 1))),
  ]

  const selected = dayMeta(selectedKey, holidayMap)
  const selectedDate = parseDateKey(selectedKey)
  const monthHolidays = useMemo(
    () =>
      [...holidayMap.values()]
        .filter((h) => h.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [holidayMap, year, month],
  )

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  return (
    <div className={cn('dashboard-surface space-y-4 p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--glass-fg)]">Holiday calendar</h2>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-9 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 text-sm font-medium text-[var(--glass-fg)]"
          aria-label="Calendar year"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--glass-border)] text-[var(--glass-fg)] hover:bg-[var(--glass-bg-muted)]"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-[var(--glass-fg)]">
          {MONTH_NAMES[month]} {year}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--glass-border)] text-[var(--glass-fg)] hover:bg-[var(--glass-bg-muted)]"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className={cn(
              'py-1 text-center text-[10px] font-bold uppercase tracking-wide',
              d === 'Sun' || d === 'Sat' ? 'text-rose-600' : 'text-[var(--glass-fg-muted)]',
            )}
          >
            {d}
          </div>
        ))}
        {cells.map((dateKey, idx) => {
          if (!dateKey) {
            return <div key={`empty-${idx}`} className="aspect-square" />
          }
          const meta = dayMeta(dateKey, holidayMap)
          const isSelected = dateKey === selectedKey
          const isToday = dateKey === todayKey
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setSelectedKey(dateKey)}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-semibold tabular-nums transition-colors',
                meta.isOff
                  ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                  : 'text-[var(--glass-fg)] hover:bg-[var(--glass-bg-muted)]',
                isSelected && 'ring-2 ring-[#1A5CA0] ring-offset-1',
                isToday && !isSelected && 'font-extrabold text-[#1A5CA0]',
              )}
              title={meta.holiday?.label ?? (meta.weekend ? 'Weekend' : undefined)}
            >
              {Number(dateKey.slice(8))}
              {meta.holiday && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-rose-500" aria-hidden />
              )}
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-muted)] px-3.5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--glass-fg-muted)]">
          {selectedKey === todayKey ? 'Today' : 'Selected'}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--glass-fg)]">
          {selectedDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <p className="mt-1 text-xs text-[var(--glass-fg-muted)]">
          {selected.holiday
            ? selected.holiday.label
            : selected.weekend
              ? 'Weekend'
              : 'Working day'}
        </p>
      </div>

      {monthHolidays.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--glass-fg-muted)]">
            Holidays this month
          </p>
          <ul className="space-y-1">
            {monthHolidays.map((h) => (
              <li
                key={h.date}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--glass-fg)] hover:bg-[var(--glass-bg-muted)]"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left font-medium"
                  onClick={() => setSelectedKey(h.date)}
                >
                  {h.label}
                </button>
                <span className="shrink-0 tabular-nums text-[var(--glass-fg-muted)]">
                  {parseDateKey(h.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-[10px] font-medium text-[var(--glass-fg-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-rose-100 ring-1 ring-rose-300" />
          Weekend / holiday
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Named holiday
        </span>
      </div>
    </div>
  )
}
