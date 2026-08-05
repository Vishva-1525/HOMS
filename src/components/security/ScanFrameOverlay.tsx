export function ScanFrameOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_42%,_rgba(0,0,0,0.55)_100%)]" />

      <div className="relative h-[min(58vw,15rem)] w-[min(58vw,15rem)] rounded-2xl ring-1 ring-white/25 sm:h-60 sm:w-60">
        <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-[3px] border-t-[3px] border-white shadow-[0_0_14px_rgba(255,255,255,0.5)] sm:h-10 sm:w-10 sm:border-l-4 sm:border-t-4" />
        <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-[3px] border-t-[3px] border-white shadow-[0_0_14px_rgba(255,255,255,0.5)] sm:h-10 sm:w-10 sm:border-r-4 sm:border-t-4" />
        <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-[#E87722] shadow-[0_0_14px_rgba(232,119,34,0.6)] sm:h-10 sm:w-10 sm:border-b-4 sm:border-l-4" />
        <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-[#E87722] shadow-[0_0_14px_rgba(232,119,34,0.6)] sm:h-10 sm:w-10 sm:border-b-4 sm:border-r-4" />

        <span
          className="absolute left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#E87722] to-transparent shadow-[0_0_12px_rgba(232,119,34,0.8)]"
          style={{ animation: 'securityScanLine 2.4s ease-in-out infinite' }}
        />
      </div>
    </div>
  )
}
