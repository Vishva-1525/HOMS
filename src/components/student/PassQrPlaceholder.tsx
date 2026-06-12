import { QrCode } from 'lucide-react'
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

export function PassQrPlaceholder({ status }: { status: OutpassStatus }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300/80 bg-white/75 p-8 text-center backdrop-blur-sm">
      <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl bg-slate-100/90">
        <div className="flex flex-col items-center gap-2 px-4">
          <QrCode className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
          <p className="text-xs font-medium text-slate-500">Awaiting approval</p>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-800">QR not available yet</p>
      <p className="max-w-[240px] text-xs leading-relaxed text-slate-600">
        {getPlaceholderMessage(status)}
      </p>
    </div>
  )
}
