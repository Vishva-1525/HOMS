export function ScanFrameOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-56 w-56 rounded-2xl ring-1 ring-white/30">
        <span className="absolute left-0 top-0 h-10 w-10 animate-pulse rounded-tl-2xl border-l-4 border-t-4 border-white shadow-[0_0_12px_rgba(255,255,255,0.45)]" />
        <span className="absolute right-0 top-0 h-10 w-10 animate-pulse rounded-tr-2xl border-r-4 border-t-4 border-white shadow-[0_0_12px_rgba(255,255,255,0.45)]" />
        <span className="absolute bottom-0 left-0 h-10 w-10 animate-pulse rounded-bl-2xl border-b-4 border-l-4 border-[#E87722] shadow-[0_0_12px_rgba(232,119,34,0.55)]" />
        <span className="absolute bottom-0 right-0 h-10 w-10 animate-pulse rounded-br-2xl border-b-4 border-r-4 border-[#E87722] shadow-[0_0_12px_rgba(232,119,34,0.55)]" />
      </div>
    </div>
  )
}
