import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatPassDate, formatReturnTime } from '@/lib/outpass'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import { isQrEligibleStatus } from '@/lib/pass-filters'
import type { GateLog, OutpassRequest } from '@/lib/types'

interface PassListCardProps {
  pass: OutpassRequest
  gateLogs: GateLog[]
  onClick: () => void
  onViewQr?: () => void
}

export function PassListCard({ pass, gateLogs, onClick, onViewQr }: PassListCardProps) {
  const displayStatus = getPassDisplayStatus(pass, gateLogs)
  const label = getPassStatusLabel(pass.status, gateLogs, pass)
  const showQr = isQrEligibleStatus(pass.status)

  return (
    <div className="glass-panel p-4 sm:p-5">
      <button type="button" onClick={onClick} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <PassTypeBadge type={pass.pass_type} />
          <div className="flex items-center gap-2">
            <span className="dashboard-muted text-xs">{formatPassDate(pass.created_at)}</span>
            <StatusBadge status={displayStatus} label={label} />
          </div>
        </div>

        <p className="mt-2 text-sm font-semibold text-slate-900">{pass.destination}</p>

        <p className="dashboard-muted mt-1 text-xs">
          {formatReturnTime(pass.departure_at)} → {formatReturnTime(pass.return_by)}
        </p>
      </button>

      {showQr && onViewQr ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          onClick={(e) => {
            e.stopPropagation()
            onViewQr()
          }}
        >
          View QR
        </Button>
      ) : (
        <p className="dashboard-muted mt-3 rounded-lg border border-dashed border-slate-300/80 bg-slate-50/70 px-3 py-2 text-center text-xs">
          QR available after warden approval
        </p>
      )}
    </div>
  )
}
