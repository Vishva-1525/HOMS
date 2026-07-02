import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardFilterChipProps {
  active: boolean
  onSelect: () => void
  onDeselect?: () => void
  children: ReactNode
  className?: string
  'aria-label'?: string
}

/**
 * Filter chip with clear active/inactive states.
 * Single-click selects; double-click on an active chip calls onDeselect (if provided).
 */
export function DashboardFilterChip({
  active,
  onSelect,
  onDeselect,
  children,
  className,
  'aria-label': ariaLabel,
}: DashboardFilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={() => {
        if (!active) onSelect()
      }}
      onDoubleClick={() => {
        if (active) onDeselect?.()
      }}
      className={cn(
        'dashboard-filter-chip focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1A5CA0] focus-visible:outline-offset-2',
        active && 'dashboard-filter-chip-active',
        className,
      )}
    >
      {children}
    </button>
  )
}
