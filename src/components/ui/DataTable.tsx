import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

export interface DataTableColumn<T> {
  header: string
  accessor: keyof T | string
  render?: (row: T, index: number) => ReactNode
  /** Skeleton width class for loading state, e.g. "w-24" */
  skeletonClassName?: string
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  className?: string
  getRowKey?: (row: T, index: number) => string | number
  getRowClassName?: (row: T, index: number) => string | undefined
}

function getCellValue<T extends object>(row: T, accessor: keyof T | string): unknown {
  if (typeof accessor === 'string' && accessor.includes('.')) {
    return accessor.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in acc) {
        return (acc as Record<string, unknown>)[key]
      }
      return undefined
    }, row)
  }
  return row[accessor as keyof T]
}

const SKELETON_ROW_COUNT = 5

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data to display',
  className,
  getRowKey,
  getRowClassName,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--svce-border-default)] bg-[var(--svce-page-bg)]">
            {columns.map((column) => (
              <th
                key={String(column.accessor)}
                className="px-4 py-3 text-[length:var(--svce-text-small)] font-medium uppercase tracking-wide text-[var(--svce-text-secondary)]"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
              <tr
                key={`skeleton-${rowIndex}`}
                className="h-[var(--table-row-height)] border-b border-[var(--svce-border-default)] bg-[var(--svce-white)]"
              >
                {columns.map((column) => (
                  <td key={String(column.accessor)} className="px-4 py-3">
                    <Skeleton className={cn('h-4', column.skeletonClassName ?? 'w-full max-w-[12rem]')} />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length}>
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                  <Inbox className="h-8 w-8 text-[var(--svce-text-muted)]" strokeWidth={1.5} />
                  <p className="text-sm text-[var(--svce-text-muted)]">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          )}

          {!loading &&
            data.map((row, rowIndex) => (
              <tr
                key={getRowKey?.(row, rowIndex) ?? rowIndex}
                className={cn(
                  'h-[var(--table-row-height)] border-b border-[var(--svce-border-default)] bg-[var(--svce-white)] transition-all duration-300 hover:bg-[var(--svce-page-bg)]',
                  getRowClassName?.(row, rowIndex),
                )}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.accessor)}
                    className="px-4 py-3 text-sm text-[var(--svce-text-primary)]"
                  >
                    {column.render
                      ? column.render(row, rowIndex)
                      : String(getCellValue(row, column.accessor) ?? '')}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
