import { StatusBadge } from '@/components/ui/StatusBadge'
import { PASS_TYPE_LABELS, formatReturnTime, formatTableDateTime } from '@/lib/outpass'
import { getPassGateSummary } from '@/lib/parent-alerts'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import type { GateLog, OutpassRequest } from '@/lib/types'

interface ParentPassTableProps {
  passes: OutpassRequest[]
  gateLogs: GateLog[]
  title?: string
  emptyMessage?: string
  limit?: number
}

export function ParentPassTable({
  passes,
  gateLogs,
  title = 'Pass history',
  emptyMessage = 'No outpass records yet.',
  limit,
}: ParentPassTableProps) {
  const rows = limit ? passes.slice(0, limit) : passes

  return (
    <div className="dashboard-surface overflow-hidden">
      <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5">
        <h2 className="dashboard-heading text-sm">{title}</h2>
      </div>

      {rows.length === 0 ? (
        <p className="dashboard-muted px-4 py-10 text-center text-sm sm:px-5">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3 sm:px-5">Requested</th>
                <th className="px-4 py-3 sm:px-5">Type</th>
                <th className="px-4 py-3 sm:px-5">Destination</th>
                <th className="px-4 py-3 sm:px-5">Departure</th>
                <th className="px-4 py-3 sm:px-5">Return by</th>
                <th className="px-4 py-3 sm:px-5">Status</th>
                <th className="px-4 py-3 sm:px-5">Exit</th>
                <th className="px-4 py-3 sm:px-5">Entry</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((pass) => {
                const displayStatus = getPassDisplayStatus(pass, gateLogs)
                const label = getPassStatusLabel(pass.status, gateLogs, pass)
                const { exitAt, entryAt } = getPassGateSummary(pass.id, gateLogs)

                return (
                  <tr
                    key={pass.id}
                    className="border-b border-slate-200/60 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-700 sm:px-5">
                      {formatTableDateTime(pass.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-900 sm:px-5">
                      {PASS_TYPE_LABELS[pass.pass_type]}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3.5 text-slate-800 sm:px-5">
                      {pass.destination}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-800 sm:px-5">
                      {formatTableDateTime(pass.departure_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-800 sm:px-5">
                      {formatReturnTime(pass.return_by)}
                    </td>
                    <td className="px-4 py-3.5 sm:px-5">
                      <StatusBadge status={displayStatus} label={label} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-700 sm:px-5">
                      {exitAt ? formatReturnTime(exitAt) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-700 sm:px-5">
                      {entryAt ? formatReturnTime(entryAt) : '—'}
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
