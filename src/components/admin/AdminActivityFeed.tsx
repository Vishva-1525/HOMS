import { Spinner } from '@/components/ui/spinner'
import { useAdminActivityFeed } from '@/hooks/admin/useAdminActivityFeed'
import { cn } from '@/lib/utils'

interface AdminActivityFeedProps {
  onStudentClick?: (studentId: string) => void
}

export function AdminActivityFeed({ onStudentClick }: AdminActivityFeedProps) {
  const { feedItems, loading } = useAdminActivityFeed()

  return (
    <div className="dashboard-surface overflow-hidden">
      <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5">
        <h2 className="dashboard-heading text-sm">Live activity</h2>
        <p className="dashboard-muted mt-0.5 text-xs">Last 30 events across the system</p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner label="Loading activity…" />
        </div>
      ) : feedItems.length === 0 ? (
        <p className="dashboard-muted px-4 py-12 text-center text-sm sm:px-5">No activity yet.</p>
      ) : (
        <ul className="max-h-[480px] divide-y divide-slate-200/60 overflow-y-auto">
          {feedItems.map((item) => (
            <li key={item.id} className="flex gap-3 px-4 py-3.5 sm:px-5">
              <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
                {item.pulse && (
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                    style={{ backgroundColor: item.dotColor }}
                  />
                )}
                <span
                  className="relative inline-flex h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.dotColor }}
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-slate-800">{item.description}</p>
                  <time className="shrink-0 text-xs text-slate-500">{item.relativeTime}</time>
                </div>
                <button
                  type="button"
                  onClick={() => onStudentClick?.(item.studentId)}
                  className={cn(
                    'mt-1 text-xs font-medium text-[#1A5CA0] hover:underline',
                    !onStudentClick && 'pointer-events-none text-slate-600',
                  )}
                >
                  {item.studentLabel}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
