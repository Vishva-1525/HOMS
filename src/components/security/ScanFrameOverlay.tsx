export function ScanFrameOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-56 w-56">
        <span className="absolute left-0 top-0 h-10 w-10 animate-pulse border-l-4 border-t-4 border-[#E87722]" />
        <span className="absolute right-0 top-0 h-10 w-10 animate-pulse border-r-4 border-t-4 border-[#E87722]" />
        <span className="absolute bottom-0 left-0 h-10 w-10 animate-pulse border-b-4 border-l-4 border-[#E87722]" />
        <span className="absolute bottom-0 right-0 h-10 w-10 animate-pulse border-b-4 border-r-4 border-[#E87722]" />
      </div>
    </div>
  )
}
