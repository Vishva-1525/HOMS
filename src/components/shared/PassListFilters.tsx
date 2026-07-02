import { RotateCcw } from 'lucide-react'
import { DashboardFilterChip } from '@/components/ui/DashboardFilterChip'
import { Button } from '@/components/ui/button'
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

export interface PassListFilterDefaults {
  statusFilter: PassClassificationFilter
  typeFilter: PassType | 'all'
  nameSearch: string
  regSearch: string
  dateFrom: string
  dateTo: string
}

export const PENDING_PAGE_FILTER_DEFAULTS: PassListFilterDefaults = {
  statusFilter: 'pending',
  typeFilter: 'all',
  nameSearch: '',
  regSearch: '',
  dateFrom: '',
  dateTo: '',
}

export const ALL_PASS_FILTER_DEFAULTS: PassListFilterDefaults = {
  statusFilter: 'all',
  typeFilter: 'all',
  nameSearch: '',
  regSearch: '',
  dateFrom: '',
  dateTo: '',
}

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
  onClearAll: () => void
  filterDefaults?: PassListFilterDefaults
  showStatusFilter?: boolean
  className?: string
}

function isFiltersActive(
  values: PassListFilterDefaults,
  defaults: PassListFilterDefaults,
): boolean {
  return (
    values.nameSearch.trim() !== defaults.nameSearch.trim() ||
    values.regSearch.trim() !== defaults.regSearch.trim() ||
    values.statusFilter !== defaults.statusFilter ||
    values.typeFilter !== defaults.typeFilter ||
    values.dateFrom !== defaults.dateFrom ||
    values.dateTo !== defaults.dateTo
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
  onClearAll,
  filterDefaults = PENDING_PAGE_FILTER_DEFAULTS,
  showStatusFilter = true,
  className,
}: PassListFiltersProps) {
  const currentValues: PassListFilterDefaults = {
    nameSearch,
    regSearch,
    statusFilter,
    typeFilter,
    dateFrom,
    dateTo,
  }
  const hasActiveFilters = isFiltersActive(currentValues, filterDefaults)

  return (
    <div className={cn('dashboard-surface-muted space-y-5 p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="dashboard-heading text-sm font-semibold">Filters</h2>
          <p className="dashboard-muted mt-0.5 text-xs">
            Double-click an active chip to remove that filter
          </p>
        </div>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="gap-1.5 text-[#1A5CA0] hover:bg-[#EBF3FF]"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            Clear all filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="filter-name" className="text-xs font-medium text-slate-700">
            Student name
          </Label>
          <Input
            id="filter-name"
            placeholder="Search by name…"
            value={nameSearch}
            onChange={(e) => onNameSearchChange(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="filter-reg" className="text-xs font-medium text-slate-700">
            Register number
          </Label>
          <Input
            id="filter-reg"
            placeholder="Search by reg no…"
            value={regSearch}
            onChange={(e) => onRegSearchChange(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:flex sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto">
          <Label htmlFor="filter-from" className="text-xs font-medium text-slate-700">
            From
          </Label>
          <Input
            id="filter-from"
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="mt-1.5 h-10 w-full sm:w-44"
          />
        </div>
        <div className="w-full sm:w-auto">
          <Label htmlFor="filter-to" className="text-xs font-medium text-slate-700">
            To
          </Label>
          <Input
            id="filter-to"
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="mt-1.5 h-10 w-full sm:w-44"
          />
        </div>
      </div>

      {showStatusFilter && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Status</p>
          <div className="flex flex-wrap gap-2">
            {CLASSIFICATION_FILTER_OPTIONS.map((option) => (
              <DashboardFilterChip
                key={option.id}
                active={statusFilter === option.id}
                onSelect={() => onStatusFilterChange(option.id)}
                onDeselect={() => onStatusFilterChange('all')}
                aria-label={`Filter by ${option.label}`}
              >
                {option.label}
              </DashboardFilterChip>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Pass type</p>
        <div className="flex flex-wrap gap-2">
          {PASS_TYPE_FILTER_OPTIONS.map((type) => (
            <DashboardFilterChip
              key={type}
              active={typeFilter === type}
              onSelect={() => onTypeFilterChange(type)}
              onDeselect={() => onTypeFilterChange('all')}
              aria-label={`Filter by ${type === 'all' ? 'all types' : PASS_TYPE_LABELS[type]}`}
            >
              {type === 'all' ? 'All types' : PASS_TYPE_LABELS[type]}
            </DashboardFilterChip>
          ))}
        </div>
      </div>
    </div>
  )
}
