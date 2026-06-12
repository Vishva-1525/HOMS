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
    <div className="fixed inset-0 z-[90] flex flex-col bg-white animate-[slideUpFull_0.3s_ease-out]">
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[var(--svce-border-default)] px-4">
        <div>
          <h2 className="text-base font-semibold text-[#1A1A2E]">Today&apos;s gate log</h2>
          <p className="text-xs text-[#4B5563]">{formatTodayDate()}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-[#4B5563] hover:bg-[#F5F7FA]"
          aria-label="Close log"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex flex-wrap gap-4 border-b border-[var(--svce-border-default)] bg-[#F5F7FA] px-4 py-3 text-sm text-[#1A1A2E]">
        <span>
          <strong>{summary.exits}</strong> exits
        </span>
        <span className="text-[#D1D5DB]">·</span>
        <span>
          <strong>{summary.entries}</strong> entries
        </span>
        <span className="text-[#D1D5DB]">·</span>
        <span>
          <strong>{summary.currentlyOutside}</strong> currently outside
        </span>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner label="Loading log…" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#4B5563]">No gate activity yet today.</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-[var(--svce-border-default)] text-left text-xs font-medium uppercase tracking-wide text-[#4B5563]">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Pass type</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[var(--svce-border-default)] last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums">
                    {formatLogTime(log.scanned_at)}
                  </td>
                  <td className="px-4 py-3 font-medium">{getStudentName(log)}</td>
                  <td className="px-4 py-3 text-[#4B5563]">{getStudentRoom(log)}</td>
                  <td className="px-4 py-3">
                    <EventBadge type={log.event_type} />
                  </td>
                  <td className="px-4 py-3">
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
  )
}

function EventBadge({ type }: { type: 'exit' | 'entry' }) {
  const isExit = type === 'exit'
  return (
    <span
      className={cn(
        'inline-flex rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-semibold uppercase',
        isExit ? 'bg-[#EBF3FF] text-[#1A5CA0]' : 'bg-[#EBF7EE] text-[#166534]',
      )}
    >
      {type}
    </span>
  )
}
