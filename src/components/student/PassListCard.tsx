import { CheckCircle2, Clock3, QrCode, XCircle } from 'lucide-react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatPassDate, formatReturnTime } from '@/lib/outpass'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import { isQrEligibleStatus } from '@/lib/pass-filters'
import { isPassTripComplete } from '@/lib/pass-multi-scan'
import type { GateLog, OutpassRequest } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PassListCardProps {
  pass: OutpassRequest
  gateLogs: GateLog[]
  studentName?: string | null
  onClick: () => void
  onViewQr?: () => void
}

type PassCardTone = 'pending' | 'approved' | 'rejected' | 'completed' | 'neutral'

function getCancelledByName(pass: OutpassRequest, studentName?: string | null): string {
  if (pass.warden_remark?.startsWith('Cancelled by ')) {
    return pass.warden_remark.replace(/^Cancelled by\s+/i, '').trim()
  }
  return studentName?.trim() || 'student'
}

function getCardTone(pass: OutpassRequest, gateLogs: GateLog[]): PassCardTone {
  if (pass.status === 'pending') return 'pending'
  if (pass.status === 'rejected' || pass.status === 'cancelled') return 'rejected'
  if (isQrEligibleStatus(pass.status)) {
    return isPassTripComplete(pass, gateLogs) ? 'completed' : 'approved'
  }
  return 'neutral'
}

const CARD_TONE_STYLES: Record<
  PassCardTone,
  { container: string; icon: typeof Clock3; iconWrap: string; statusHint: string }
> = {
  pending: {
    container: 'liquid-glass border-amber-300/50 ring-1 ring-amber-400/20',
    icon: Clock3,
    iconWrap: 'bg-[var(--svce-warning-tint)] text-[var(--svce-warning)] ring-amber-300/40',
    statusHint: 'Awaiting warden approval',
  },
  approved: {
    container: 'liquid-glass border-emerald-300/45 ring-1 ring-emerald-400/20',
    icon: CheckCircle2,
    iconWrap: 'bg-[var(--svce-green-tint)] text-[var(--svce-accent-green)] ring-emerald-300/40',
    statusHint: 'Approved — QR ready at gate',
  },
  rejected: {
    container: 'liquid-glass border-red-300/40 ring-1 ring-red-400/15',
    icon: XCircle,
    iconWrap: 'bg-[var(--svce-danger-tint)] text-[var(--svce-danger)] ring-red-300/40',
    statusHint: 'Request not approved',
  },
  completed: {
    container: 'liquid-glass',
    icon: CheckCircle2,
    iconWrap: 'bg-slate-500/10 text-[var(--svce-text-secondary)] ring-white/30',
    statusHint: 'Trip completed',
  },
  neutral: {
    container: 'liquid-glass',
    icon: Clock3,
    iconWrap: 'bg-slate-500/10 text-[var(--svce-text-secondary)] ring-white/30',
    statusHint: '',
  },
}

export function PassListCard({
  pass,
  gateLogs,
  studentName,
  onClick,
  onViewQr,
}: PassListCardProps) {
  const displayStatus = getPassDisplayStatus(pass, gateLogs)
  const label = getPassStatusLabel(pass.status, gateLogs, pass)
  const showQr = isQrEligibleStatus(pass.status)
  const tone = getCardTone(pass, gateLogs)
  const toneStyle = CARD_TONE_STYLES[tone]
  const StatusIcon = toneStyle.icon
  const statusHint =
    pass.status === 'cancelled'
      ? `Cancelled by ${getCancelledByName(pass, studentName)}`
      : toneStyle.statusHint

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl p-4 transition-shadow hover:shadow-xl sm:p-5',
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

            {statusHint && (
              <p
                className={cn(
                  'mt-2 text-xs font-medium',
                  tone === 'pending' && 'text-amber-800',
                  tone === 'approved' && 'text-emerald-800',
                  tone === 'rejected' && 'text-red-800',
                  tone === 'completed' && 'text-slate-600',
                )}
              >
                {statusHint}
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
