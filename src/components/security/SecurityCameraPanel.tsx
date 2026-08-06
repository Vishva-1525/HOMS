import type { RefObject } from 'react'
import { Loader2, ScanBarcode } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SecurityCameraPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>
  starting: boolean
  error: string | null
  className?: string
}

export function SecurityCameraPanel({
  videoRef,
  starting,
  error,
  className,
}: SecurityCameraPanelProps) {
  return (
    <div
      className={cn(
        'relative min-h-[min(52dvh,28rem)] flex-1 overflow-hidden rounded-2xl bg-black',
        className,
      )}
    >
      <video
        ref={videoRef}
        className="h-full min-h-[min(52dvh,28rem)] w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[min(58vw,14rem)] w-[min(58vw,14rem)] rounded-2xl ring-2 ring-white/40 sm:h-56 sm:w-56">
          <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-[3px] border-t-[3px] border-white" />
          <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-[3px] border-t-[3px] border-white" />
          <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-emerald-400" />
          <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-emerald-400" />
        </div>
      </div>

      {starting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm font-medium text-white/90">Starting camera…</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-6 text-center">
          <div className="max-w-xs space-y-3">
            <ScanBarcode className="mx-auto h-10 w-10 text-white/80" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-white">Camera unavailable</p>
            <p className="text-sm leading-relaxed text-white/75">{error}</p>
            <p className="text-xs text-white/55">
              You can still scan with the desktop QR reader.
            </p>
          </div>
        </div>
      )}

      {!starting && !error && (
        <p className="pointer-events-none absolute left-0 right-0 top-4 text-center text-xs font-medium tracking-wide text-white/85">
          Hold the pass QR in front of this camera
        </p>
      )}
    </div>
  )
}
