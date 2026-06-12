import { Skeleton } from '@/components/ui/Skeleton'

export function DashboardLoadingSkeleton() {
  return (
    <div className="flex min-h-screen bg-[var(--svce-page-bg)]">
      <aside className="hidden w-60 shrink-0 flex-col bg-[#0D3F72] p-4 md:flex">
        <Skeleton className="h-9 w-32 bg-white/20" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-white/10" />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[60px] items-center gap-4 border-b border-[var(--svce-border-default)] bg-white px-6">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-32" />
          <div className="ml-auto flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="hidden h-4 w-36 sm:block" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>

        <main className="flex-1 p-6">
          <Skeleton className="mb-6 h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />
            ))}
          </div>
          <Skeleton className="mt-6 h-64 rounded-[var(--radius-lg)]" />
        </main>
      </div>
    </div>
  )
}
