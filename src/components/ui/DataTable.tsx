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
  width?: string
  headerClassName?: string
  cellClassName?: string
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  className?: string
  tableClassName?: string
  getRowKey?: (row: T, index: number) => string | number
  getRowClassName?: (row: T, index: number) => string | undefined
  onRowClick?: (row: T, index: number) => void
  /** Renders card rows on viewports below md; table is used from md upward. */
  mobileCardRender?: (row: T, index: number) => ReactNode
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <Inbox className="h-8 w-8 text-slate-500" strokeWidth={1.5} />
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  )
}

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data to display',
  className,
  tableClassName,
  getRowKey,
  getRowClassName,
  onRowClick,
  mobileCardRender,
}: DataTableProps<T>) {
  const showMobileCards = Boolean(mobileCardRender)

  return (
    <div className={className}>
      {showMobileCards && (
        <div className="divide-y divide-slate-200/60 md:hidden">
          {loading &&
            Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
              <div key={`mobile-skeleton-${rowIndex}`} className="space-y-2 px-4 py-3.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ))}

          {!loading && data.length === 0 && <EmptyState message={emptyMessage} />}

          {!loading &&
            data.map((row, rowIndex) => (
              <div
                key={getRowKey?.(row, rowIndex) ?? rowIndex}
                className={cn(
                  'transition-opacity duration-300',
                  getRowClassName?.(row, rowIndex),
                )}
                onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
              >
                {mobileCardRender!(row, rowIndex)}
              </div>
            ))}
        </div>
      )}

      <div className={cn('overflow-x-auto', showMobileCards && 'hidden md:block')}>
        <table className={cn('w-full min-w-[640px] border-collapse text-left', tableClassName)}>
          <thead>
            <tr className="border-b border-white/50 bg-white/45">
              {columns.map((column) => (
                <th
                  key={String(column.accessor)}
                  style={column.width ? { width: column.width, minWidth: column.width } : undefined}
                  className={cn(
                    'px-4 py-3 text-[length:var(--svce-text-small)] font-semibold uppercase tracking-wide text-slate-700',
                    column.headerClassName,
                  )}
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
                  className="h-[var(--table-row-height)] border-b border-white/40 bg-transparent"
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
                  <EmptyState message={emptyMessage} />
                </td>
              </tr>
            )}

            {!loading &&
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey?.(row, rowIndex) ?? rowIndex}
                  className={cn(
                    'h-[var(--table-row-height)] border-b border-white/40 bg-transparent transition-all duration-300 hover:bg-white/35',
                    getRowClassName?.(row, rowIndex),
                  )}
                  onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.accessor)}
                      style={column.width ? { width: column.width, minWidth: column.width } : undefined}
                      className={cn('px-4 py-3 text-sm text-slate-800', column.cellClassName)}
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
    </div>
  )
}
