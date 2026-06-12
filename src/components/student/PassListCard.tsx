import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatPassDate, formatReturnTime } from '@/lib/outpass'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import { isQrEligibleStatus } from '@/lib/pass-filters'
import type { GateLog, OutpassRequest } from '@/lib/types'
import { cn } from '@/lib/utils'

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
    <div
      className={cn(
        'rounded-xl border border-[var(--svce-border-default)] bg-white p-4',
      )}
    >
      <button type="button" onClick={onClick} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <PassTypeBadge type={pass.pass_type} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--svce-text-muted)]">
              {formatPassDate(pass.created_at)}
            </span>
            <StatusBadge status={displayStatus} label={label} />
          </div>
        </div>

        <p className="mt-2 text-sm font-medium text-[#1A1A2E]">{pass.destination}</p>

        <p className="mt-1 text-xs text-[var(--svce-text-muted)]">
          {formatReturnTime(pass.departure_at)} → {formatReturnTime(pass.return_by)}
        </p>
      </button>

      {showQr && onViewQr && (
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
      )}
    </div>
  )
}
