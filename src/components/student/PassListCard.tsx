import { CheckCircle2, Clock3, QrCode, XCircle } from 'lucide-react'
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

type PassCardTone = 'pending' | 'approved' | 'rejected' | 'completed' | 'neutral'

function getCardTone(pass: OutpassRequest, gateLogs: GateLog[]): PassCardTone {
  if (pass.status === 'pending') return 'pending'
  if (pass.status === 'rejected' || pass.status === 'cancelled') return 'rejected'
  if (isQrEligibleStatus(pass.status)) {
    const hasReturned = gateLogs.some(
      (log) => log.outpass_id === pass.id && log.event_type === 'entry',
    )
    return hasReturned ? 'completed' : 'approved'
  }
  return 'neutral'
}

const CARD_TONE_STYLES: Record<
  PassCardTone,
  { container: string; icon: typeof Clock3; iconWrap: string; statusHint: string }
> = {
  pending: {
    container:
      'border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white/95 to-white/90 shadow-amber-900/5',
    icon: Clock3,
    iconWrap: 'bg-amber-100 text-amber-700 ring-amber-200/80',
    statusHint: 'Awaiting warden approval',
  },
  approved: {
    container:
      'border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white/95 to-white/90 shadow-emerald-900/5',
    icon: CheckCircle2,
    iconWrap: 'bg-emerald-100 text-emerald-700 ring-emerald-200/80',
    statusHint: 'Approved — QR ready at gate',
  },
  rejected: {
    container:
      'border-red-200/70 bg-gradient-to-br from-red-50/70 via-white/95 to-white/90 shadow-red-900/5',
    icon: XCircle,
    iconWrap: 'bg-red-100 text-red-700 ring-red-200/80',
    statusHint: 'Request not approved',
  },
  completed: {
    container:
      'border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-white/95 to-white/90 shadow-slate-900/5',
    icon: CheckCircle2,
    iconWrap: 'bg-slate-100 text-slate-600 ring-slate-200/80',
    statusHint: 'Trip completed',
  },
  neutral: {
    container: 'border-white/70 bg-white/90 shadow-slate-900/5',
    icon: Clock3,
    iconWrap: 'bg-slate-100 text-slate-600 ring-slate-200/80',
    statusHint: '',
  },
}

export function PassListCard({ pass, gateLogs, onClick, onViewQr }: PassListCardProps) {
  const displayStatus = getPassDisplayStatus(pass, gateLogs)
  const label = getPassStatusLabel(pass.status, gateLogs, pass)
  const showQr = isQrEligibleStatus(pass.status)
  const tone = getCardTone(pass, gateLogs)
  const toneStyle = CARD_TONE_STYLES[tone]
  const StatusIcon = toneStyle.icon

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur-xl transition-shadow hover:shadow-xl sm:p-5',
        toneStyle.container,
      )}
    >
      <button type="button" onClick={onClick} className="w-full text-left">
        <div className="flex gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
              toneStyle.iconWrap,
            )}
            aria-hidden
          >
            <StatusIcon className="h-5 w-5" strokeWidth={1.75} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <PassTypeBadge type={pass.pass_type} />
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="dashboard-muted text-xs">{formatPassDate(pass.created_at)}</span>
                <StatusBadge status={displayStatus} label={label} />
              </div>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-900">{pass.destination}</p>

            <p className="dashboard-muted mt-1 text-xs">
              {formatReturnTime(pass.departure_at)} → {formatReturnTime(pass.return_by)}
            </p>

            {toneStyle.statusHint && (
              <p
                className={cn(
                  'mt-2 text-xs font-medium',
                  tone === 'pending' && 'text-amber-800',
                  tone === 'approved' && 'text-emerald-800',
                  tone === 'rejected' && 'text-red-800',
                  tone === 'completed' && 'text-slate-600',
                )}
              >
                {toneStyle.statusHint}
              </p>
            )}
          </div>
        </div>
      </button>

      {showQr && onViewQr ? (
        <Button
          type="button"
          size="sm"
          className="mt-4 w-full gap-2"
          onClick={(e) => {
            e.stopPropagation()
            onViewQr()
          }}
        >
          <QrCode className="h-4 w-4" strokeWidth={1.75} />
          View QR
        </Button>
      ) : pass.status === 'pending' ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300/70 bg-amber-50/50 px-3 py-2.5 text-center text-xs font-medium text-amber-800">
          <Clock3 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          QR available after warden approval
        </div>
      ) : null}
    </div>
  )
}
