import { PASS_FILTERS, type PassFilter } from '@/lib/pass-filters'
import { cn } from '@/lib/utils'

interface PassFilterChipsProps {
  value: PassFilter
  onChange: (filter: PassFilter) => void
}

export function PassFilterChips({ value, onChange }: PassFilterChipsProps) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
      {PASS_FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
            value === filter.id
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'border border-white/45 bg-white/45 text-muted-foreground hover:bg-white/60',
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
