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
            'shrink-0 rounded-[var(--radius-full)] px-3.5 py-1.5 text-xs font-medium transition-colors',
            value === filter.id
              ? 'bg-[#1A5CA0] text-white'
              : 'bg-white text-[#4B5563] border border-[var(--svce-border-default)]',
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
