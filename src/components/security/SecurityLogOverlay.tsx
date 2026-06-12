import { X } from 'lucide-react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { Spinner } from '@/components/ui/spinner'
import { useSecurityGateLog } from '@/hooks/security/useSecurityGateLog'
import { formatTodayDate } from '@/lib/relative-time'
import { cn } from '@/lib/utils'

interface SecurityLogOverlayProps {
  open: boolean
  onClose: () => void
}

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function SecurityLogOverlay({ open, onClose }: SecurityLogOverlayProps) {
  const { logs, summary, loading, error, getStudentName, getStudentRoom } = useSecurityGateLog()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-900/40 p-3 backdrop-blur-sm animate-[slideUpFull_0.3s_ease-out] sm:p-4">
      <div className="dashboard-surface flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-4 py-4 sm:px-5">
          <div>
            <h2 className="dashboard-heading text-base sm:text-lg">Today&apos;s gate log</h2>
            <p className="dashboard-muted mt-0.5 text-xs">{formatTodayDate()}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Close log"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 sm:px-5">
          <span>
            <strong>{summary.exits}</strong> exits
          </span>
          <span className="text-slate-300">·</span>
          <span>
            <strong>{summary.entries}</strong> entries
          </span>
          <span className="text-slate-300">·</span>
          <span>
            <strong>{summary.currentlyOutside}</strong> currently outside
          </span>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-5">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner label="Loading log…" />
            </div>
          ) : logs.length === 0 ? (
            <p className="dashboard-muted py-16 text-center text-sm">No gate activity yet today.</p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-sm">
                <tr className="border-b border-slate-200/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-3 sm:px-5">Time</th>
                  <th className="px-4 py-3 sm:px-5">Student</th>
                  <th className="px-4 py-3 sm:px-5">Room</th>
                  <th className="px-4 py-3 sm:px-5">Event</th>
                  <th className="px-4 py-3 sm:px-5">Pass type</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-200/60 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-slate-800 sm:px-5">
                      {formatLogTime(log.scanned_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 sm:px-5">
                      {getStudentName(log)}
                    </td>
                    <td className="dashboard-muted px-4 py-3 sm:px-5">{getStudentRoom(log)}</td>
                    <td className="px-4 py-3 sm:px-5">
                      <EventBadge type={log.event_type} />
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      {log.outpass_requests?.pass_type ? (
                        <PassTypeBadge type={log.outpass_requests.pass_type} />
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function EventBadge({ type }: { type: 'exit' | 'entry' }) {
  const isExit = type === 'exit'
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase',
        isExit ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800',
      )}
    >
      {type}
    </span>
  )
}
