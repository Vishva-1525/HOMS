import { Link } from 'react-router-dom'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MobileDataCard } from '@/components/ui/MobileDataCard'
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
    <div className="dashboard-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 sm:px-5">
        <h2 className="dashboard-heading text-sm">Recent requests</h2>
        <Link
          to="/student/passes"
          className="dashboard-link text-xs underline-offset-4"
        >
          View all
        </Link>
      </div>

      {passes.length === 0 ? (
        <p className="dashboard-muted px-4 py-10 text-center text-sm sm:px-5">
          No outpass requests yet.
        </p>
      ) : (
        <>
          <div className="divide-y divide-slate-200/60 md:hidden">
            {passes.map((pass) => {
              const displayStatus = getPassDisplayStatus(pass, gateLogs)
              const label = getPassStatusLabel(pass.status, gateLogs, pass)

              return (
                <MobileDataCard key={pass.id} onClick={() => onSelectPass(pass)}>
                  <div className="flex items-center justify-between gap-2">
                    <PassTypeBadge type={pass.pass_type} />
                    <StatusBadge status={displayStatus} label={label} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{pass.destination}</p>
                  <p className="dashboard-muted mt-1 text-xs">
                    {formatTableDateTime(pass.departure_at)} → {formatTableDateTime(pass.return_by)}
                  </p>
                </MobileDataCard>
              )
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="dashboard-table-head">
                  <th className="px-4 py-3 sm:px-5">Type</th>
                  <th className="px-4 py-3 sm:px-5">Destination</th>
                  <th className="px-4 py-3 sm:px-5">Departure</th>
                  <th className="px-4 py-3 sm:px-5">Return</th>
                  <th className="px-4 py-3 sm:px-5">Status</th>
                </tr>
              </thead>
              <tbody>
                {passes.map((pass) => {
                  const displayStatus = getPassDisplayStatus(pass, gateLogs)
                  const label = getPassStatusLabel(pass.status, gateLogs, pass)

                  return (
                    <tr
                      key={pass.id}
                      className="dashboard-table-row cursor-pointer last:border-0"
                      onClick={() => onSelectPass(pass)}
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-900 sm:px-5">
                        {PASS_TYPE_LABELS[pass.pass_type]}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3.5 text-slate-800 sm:px-5">
                        {pass.destination}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-800 sm:px-5">
                        {formatTableDateTime(pass.departure_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-800 sm:px-5">
                        {formatTableDateTime(pass.return_by)}
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <StatusBadge status={displayStatus} label={label} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
