import { QrCode } from 'lucide-react'
import { formatQrAvailabilityMessage } from '@/lib/qr-availability'
import type { OutpassStatus } from '@/lib/types'

function getPlaceholderMessage(status: OutpassStatus): string {
  switch (status) {
    case 'pending':
      return 'Your QR code will appear here once your warden approves this request.'
    case 'rejected':
      return 'This request was rejected. No QR code is available.'
    case 'cancelled':
      return 'This request was cancelled. No QR code is available.'
    default:
      return 'QR code is not available for this pass.'
  }
}

interface PassQrPlaceholderProps {
  status: OutpassStatus
  variant?: 'approval' | 'before-departure' | 'expired'
  opensAt?: string
  /** Live countdown until unlock, e.g. "29:58" */
  countdownLabel?: string
  windowMinutes?: number
}

export function PassQrPlaceholder({
  status,
  variant = 'approval',
  opensAt,
  countdownLabel,
  windowMinutes,
}: PassQrPlaceholderProps) {
  const isBeforeDeparture = variant === 'before-departure'
  const isExpired = variant === 'expired'

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300/80 bg-[var(--glass-bg)] p-8 text-center">
      <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl bg-slate-100/90">
        <div className="flex flex-col items-center gap-2 px-4">
          <QrCode className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
          <p className="text-xs font-medium text-slate-500">
            {isExpired
              ? 'QR expired'
              : isBeforeDeparture
                ? 'QR unlocking soon'
                : 'Awaiting approval'}
          </p>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-800">
        {isExpired ? 'QR no longer valid' : 'QR not available yet'}
      </p>
      <p className="max-w-[260px] text-xs leading-relaxed text-slate-600">
        {isExpired
          ? 'This pass QR has expired. Submit a new request to renew access.'
          : isBeforeDeparture
            ? formatQrAvailabilityMessage(windowMinutes)
            : getPlaceholderMessage(status)}
      </p>
      {isBeforeDeparture && countdownLabel && (
        <div className="rounded-xl border border-[#BFDBFE] bg-[#EBF3FF] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0D3F72]/70">
            QR available in
          </p>
          <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-[#0D3F72]">
            {countdownLabel}
          </p>
        </div>
      )}
      {isBeforeDeparture && opensAt && (
        <p className="text-xs font-medium text-[#1A5CA0]">Unlocks at {opensAt}</p>
      )}
    </div>
  )
}
