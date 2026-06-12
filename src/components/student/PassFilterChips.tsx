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
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
