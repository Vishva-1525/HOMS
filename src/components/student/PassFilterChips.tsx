import { PASS_FILTERS, type PassFilter } from '@/lib/pass-filters'
import { cn } from '@/lib/utils'

interface PassFilterChipsProps {
  value: PassFilter
  onChange: (filter: PassFilter) => void
}

export function PassFilterChips({ value, onChange }: PassFilterChipsProps) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {PASS_FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={cn(
            'shrink-0',
            value === filter.id ? 'dashboard-filter-chip-active' : 'dashboard-filter-chip',
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
