import { Suspense, type ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'

/** Light in-shell fallback — keeps sidebar/topbar visible while a lazy page chunks in. */
export function PageLoadFallback({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="dashboard-loading-panel min-h-[40vh]">
      <Spinner label={label} />
    </div>
  )
}

export function SuspenseOutlet({
  children,
  label,
}: {
  children: ReactNode
  label?: string
}) {
  return <Suspense fallback={<PageLoadFallback label={label} />}>{children}</Suspense>
}
