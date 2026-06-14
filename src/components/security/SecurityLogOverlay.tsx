import { X } from 'lucide-react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { MobileDataCard, MobileDataCardRow } from '@/components/ui/MobileDataCard'
import { Spinner } from '@/components/ui/spinner'
import { useSecurityGateLog } from '@/hooks/security/useSecurityGateLog'
import { cn } from '@/lib/utils'

interface SecurityLogOverlayProps {
  open: boolean
  onClose: () => void
}

function formatLogDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function SecurityLogOverlay({ open, onClose }: SecurityLogOverlayProps) {
  const { logsByDate, summary, loading, error } = useSecurityGateLog(open)

  if (!open) return null

  const totalLogs = logsByDate.reduce((sum, [, rows]) => sum + rows.length, 0)

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-900/45 p-0 backdrop-blur-md animate-[slideUpFull_0.3s_ease-out] sm:p-4">
      <div className="dashboard-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-none sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-4 py-4 sm:px-5">
          <div>
            <h2 className="dashboard-heading text-base sm:text-lg">Gate history</h2>
            <p className="dashboard-muted mt-0.5 text-xs">Last 30 days · newest first</p>
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

        <div className="grid grid-cols-2 gap-2 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs text-slate-800 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-1 sm:px-5 sm:text-sm">
          <span>
            Today: <strong>{summary.exits}</strong> exits
          </span>
          <span className="hidden text-slate-300 sm:inline">·</span>
          <span>
            <strong>{summary.entries}</strong> entries
          </span>
          <span className="hidden text-slate-300 sm:inline">·</span>
          <span>
            <strong>{summary.currentlyOutside}</strong> outside
          </span>
          <span className="hidden text-slate-300 sm:inline">·</span>
          <span>
            <strong>{totalLogs}</strong> total records
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
          ) : totalLogs === 0 ? (
            <p className="dashboard-muted py-16 text-center text-sm">
              No gate activity in the last 30 days.
            </p>
          ) : (
            <div className="divide-y divide-slate-200/80">
              {logsByDate.map(([dateLabel, dayLogs]) => (
                <section key={dateLabel}>
                  <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-100/95 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 backdrop-blur-sm sm:px-5">
                    {dateLabel}
                    <span className="ml-2 font-normal normal-case text-slate-500">
                      ({dayLogs.length} record{dayLogs.length !== 1 ? 's' : ''})
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200/60 md:hidden">
                    {dayLogs.map((log) => (
                      <MobileDataCard key={log.id}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{log.studentName}</p>
                            <p className="mt-0.5 font-mono text-xs text-[#1A5CA0]">{log.admissionNo}</p>
                          </div>
                          <EventBadge type={log.event_type} />
                        </div>
                        <div className="mt-2 space-y-1">
                          <MobileDataCardRow
                            label="Time"
                            value={`${formatLogTime(log.scanned_at)} · ${formatLogDate(log.scanned_at)}`}
                          />
                          <MobileDataCardRow label="Room" value={log.room} />
                          <MobileDataCardRow
                            label="Pass"
                            value={log.passType ? <PassTypeBadge type={log.passType} /> : '—'}
                          />
                          <MobileDataCardRow label="Destination" value={log.destination} />
                        </div>
                      </MobileDataCard>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2.5 sm:px-5">Time</th>
                        <th className="px-4 py-2.5 sm:px-5">Admission no</th>
                        <th className="px-4 py-2.5 sm:px-5">Student</th>
                        <th className="px-4 py-2.5 sm:px-5">Room</th>
                        <th className="px-4 py-2.5 sm:px-5">Event</th>
                        <th className="px-4 py-2.5 sm:px-5">Pass</th>
                        <th className="px-4 py-2.5 sm:px-5">Destination</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b border-slate-200/40 last:border-0 hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                            <span className="font-mono tabular-nums text-slate-800">
                              {formatLogTime(log.scanned_at)}
                            </span>
                            <span className="dashboard-muted ml-2 text-xs sm:hidden">
                              {formatLogDate(log.scanned_at)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-slate-900 sm:px-5">
                            {log.admissionNo}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900 sm:px-5">
                            {log.studentName}
                          </td>
                          <td className="dashboard-muted px-4 py-3 sm:px-5">{log.room}</td>
                          <td className="px-4 py-3 sm:px-5">
                            <EventBadge type={log.event_type} />
                          </td>
                          <td className="px-4 py-3 sm:px-5">
                            {log.passType ? (
                              <PassTypeBadge type={log.passType} />
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="dashboard-muted max-w-[140px] truncate px-4 py-3 sm:px-5">
                            {log.destination}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </section>
              ))}
            </div>
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
