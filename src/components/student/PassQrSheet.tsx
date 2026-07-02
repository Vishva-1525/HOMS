import { X } from 'lucide-react'
import { PassQrCode } from '@/components/student/PassQrCode'
import type { OutpassRequest, StudentPassQuotas } from '@/lib/types'

interface PassQrSheetProps {
  open: boolean
  pass: OutpassRequest
  quotas?: StudentPassQuotas
  approvedPasses?: OutpassRequest[]
  onClose: () => void
}

export function PassQrSheet({
  open,
  pass,
  quotas,
  approvedPasses,
  onClose,
}: PassQrSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="dashboard-surface qr-pass-modal relative z-10 w-full max-w-sm rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:rounded-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="dashboard-heading text-lg font-semibold">Your pass QR</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1A5CA0]"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        <PassQrCode pass={pass} quotas={quotas} approvedPasses={approvedPasses} />
      </div>
    </div>
  )
}
