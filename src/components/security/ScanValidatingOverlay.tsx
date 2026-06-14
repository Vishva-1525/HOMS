import { Loader2 } from 'lucide-react'

export function ScanValidatingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white/85 backdrop-blur-md">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#1A5CA0]/15" />
        <span className="absolute inset-2 rounded-full border-2 border-[#1A5CA0]/20" />
        <Loader2 className="relative h-8 w-8 animate-spin text-[#1A5CA0]" aria-hidden />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-900">Verifying pass…</p>
        <p className="mt-1 text-xs text-slate-500">Checking approval and gate status</p>
      </div>
    </div>
  )
}
