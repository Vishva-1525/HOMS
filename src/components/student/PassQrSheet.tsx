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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="dashboard-surface relative z-10 w-full max-w-sm rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:rounded-2xl">
        <h3 className="dashboard-heading mb-4 text-center text-lg font-semibold">Your pass QR</h3>
        <PassQrCode pass={pass} quotas={quotas} approvedPasses={approvedPasses} />
      </div>
    </div>
  )
}
