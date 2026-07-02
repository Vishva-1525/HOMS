import { Clock, ChevronRight } from 'lucide-react'
import { formatReturnTime } from '@/lib/outpass'
import type { OutpassRequest } from '@/lib/types'

interface ExtensionRequestBannerProps {
  pass: OutpassRequest
  onRequestExtension: () => void
}

export function ExtensionRequestBanner({ pass, onRequestExtension }: ExtensionRequestBannerProps) {
  return (
    <button
      type="button"
      onClick={onRequestExtension}
      className="group w-full rounded-2xl border border-[#1A5CA0]/25 bg-gradient-to-r from-[#EBF3FF]/95 via-white/95 to-white/90 p-4 text-left shadow-lg shadow-[#1A5CA0]/8 backdrop-blur-xl transition-all hover:border-[#1A5CA0]/40 hover:shadow-xl sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A5CA0]/10 text-[#1A5CA0] ring-1 ring-[#1A5CA0]/20">
          <Clock className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Need more time?</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Request a pass extension before your return deadline (
            {formatReturnTime(pass.return_by)}).
          </p>
        </div>
        <ChevronRight
          className="mt-0.5 h-5 w-5 shrink-0 text-[#1A5CA0] transition-transform group-hover:translate-x-0.5"
          strokeWidth={1.75}
        />
      </div>
    </button>
  )
}
