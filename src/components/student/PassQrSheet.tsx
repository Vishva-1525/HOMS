import { PassQrCode } from '@/components/student/PassQrCode'
import type { OutpassRequest } from '@/lib/types'

interface PassQrSheetProps {
  open: boolean
  pass: OutpassRequest
  onClose: () => void
}

export function PassQrSheet({ open, pass, onClose }: PassQrSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-t-2xl border border-[var(--svce-border-default)] bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:rounded-2xl">
        <h3 className="mb-4 text-center text-lg font-semibold text-[#1A1A2E]">Your pass QR</h3>
        <PassQrCode pass={pass} />
      </div>
    </div>
  )
}
