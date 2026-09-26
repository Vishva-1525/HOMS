import { Skeleton } from '@/components/ui/Skeleton'

/** Above-the-fold dashboard placeholder — paints instantly while data loads. */
export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-[var(--radius-lg)]" />
      <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
    </div>
  )
}
