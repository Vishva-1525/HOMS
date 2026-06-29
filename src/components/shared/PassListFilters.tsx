import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { PASS_TYPE_LABELS } from '@/lib/outpass'
import type { PassType } from '@/lib/types'
import { cn } from '@/lib/utils'

export const PASS_TYPE_FILTER_OPTIONS: (PassType | 'all')[] = [
  'all',
  'outpass',
  'staypass',
  'night_pass',
  'special_pass',
]

export type PassClassificationFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'expired'
  | 'overdue'
  | 'return_completed'
  | 'rejected'
  | 'completed'
  | 'cancelled'

export const CLASSIFICATION_FILTER_OPTIONS: {
  id: PassClassificationFilter
  label: string
}[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'expired', label: 'Expired' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'return_completed', label: 'Return Completed' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

interface PassListFiltersProps {
  nameSearch: string
  regSearch: string
  onNameSearchChange: (value: string) => void
  onRegSearchChange: (value: string) => void
  statusFilter: PassClassificationFilter
  onStatusFilterChange: (value: PassClassificationFilter) => void
  typeFilter: PassType | 'all'
  onTypeFilterChange: (value: PassType | 'all') => void
  dateFrom: string
  dateTo: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  showStatusFilter?: boolean
  className?: string
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active ? 'bg-[#1A5CA0] text-white' : 'bg-white/60 text-slate-700 hover:bg-white/80',
      )}
    >
      {children}
    </button>
  )
}

export function PassListFilters({
  nameSearch,
  regSearch,
  onNameSearchChange,
  onRegSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  showStatusFilter = true,
  className,
}: PassListFiltersProps) {
  return (
    <div className={cn('dashboard-surface-muted space-y-4 p-4', className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="filter-name" className="text-xs">
            Student name
          </Label>
          <Input
            id="filter-name"
            placeholder="Search by name…"
            value={nameSearch}
            onChange={(e) => onNameSearchChange(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="filter-reg" className="text-xs">
            Register number
          </Label>
          <Input
            id="filter-reg"
            placeholder="Search by reg no…"
            value={regSearch}
            onChange={(e) => onRegSearchChange(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto">
          <Label htmlFor="filter-from" className="text-xs">
            From
          </Label>
          <Input
            id="filter-from"
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="mt-1 h-9 w-full sm:w-40"
          />
        </div>
        <div className="w-full sm:w-auto">
          <Label htmlFor="filter-to" className="text-xs">
            To
          </Label>
          <Input
            id="filter-to"
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="mt-1 h-9 w-full sm:w-40"
          />
        </div>
      </div>

      {showStatusFilter && (
        <div className="flex flex-wrap gap-2">
          {CLASSIFICATION_FILTER_OPTIONS.map((option) => (
            <FilterChip
              key={option.id}
              active={statusFilter === option.id}
              onClick={() => onStatusFilterChange(option.id)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PASS_TYPE_FILTER_OPTIONS.map((type) => (
          <FilterChip
            key={type}
            active={typeFilter === type}
            onClick={() => onTypeFilterChange(type)}
          >
            {type === 'all' ? 'All types' : PASS_TYPE_LABELS[type]}
          </FilterChip>
        ))}
      </div>
    </div>
  )
}
