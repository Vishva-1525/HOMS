import { Loader2 } from 'lucide-react'

export function ScanValidatingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
      <Loader2 className="h-8 w-8 animate-spin text-[#1A5CA0]" aria-hidden />
      <p className="text-sm font-medium text-slate-800">Verifying pass…</p>
    </div>
  )
}
