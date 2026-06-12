import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PASS_TYPE_LABELS, formatTableDateTime } from '@/lib/outpass'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import type { GateLog, OutpassRequest } from '@/lib/types'

interface StudentRecentRequestsTableProps {
  passes: OutpassRequest[]
  gateLogs: GateLog[]
  onSelectPass: (pass: OutpassRequest) => void
}

export function StudentRecentRequestsTable({
  passes,
  gateLogs,
  onSelectPass,
}: StudentRecentRequestsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--svce-border-default)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--svce-border-default)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#1A1A2E]">Recent requests</h2>
        <Link to="/student/passes" className="text-xs font-medium text-[#1A5CA0] hover:underline">
          View all
        </Link>
      </div>

      {passes.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-[var(--svce-text-muted)]">
          No outpass requests yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[var(--svce-border-default)] bg-[var(--svce-page-bg)] text-left text-xs font-medium uppercase tracking-wide text-[var(--svce-text-secondary)]">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Departure</th>
                <th className="px-4 py-3">Return</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass) => {
                const displayStatus = getPassDisplayStatus(pass, gateLogs)
                const label = getPassStatusLabel(pass.status, gateLogs, pass)

                return (
                  <tr
                    key={pass.id}
                    className="cursor-pointer border-b border-[var(--svce-border-default)] last:border-0 hover:bg-[var(--svce-page-bg)]"
                    onClick={() => onSelectPass(pass)}
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#1A1A2E]">
                      {PASS_TYPE_LABELS[pass.pass_type]}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3.5 text-[#1A1A2E]">
                      {pass.destination}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#1A1A2E]">
                      {formatTableDateTime(pass.departure_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#1A1A2E]">
                      {formatTableDateTime(pass.return_by)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={displayStatus} label={label} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
