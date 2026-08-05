import { ScanBarcode, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HardwareScannerPanelProps {
  active: boolean
  className?: string
}

/**
 * Idle / ready state for desk-mounted 2D barcode scanners (keyboard wedge).
 * No webcam preview — the hardware scanner is the sole QR input device.
 */
export function HardwareScannerPanel({ active, className }: HardwareScannerPanelProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-[min(48dvh,24rem)] flex-1 flex-col items-center justify-center overflow-hidden px-5 py-8 text-center',
        'bg-gradient-to-br from-[#0A335C] via-[#1A5CA0] to-[#0D3F72]',
        className,
      )}
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.14)_0%,transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 flex max-w-sm flex-col items-center gap-4">
        <div
          className={cn(
            'flex h-20 w-20 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-white shadow-lg ring-2 ring-white/15',
            active && 'animate-pulse',
          )}
        >
          <ScanBarcode className="h-10 w-10" strokeWidth={1.75} aria-hidden />
        </div>

        <div>
          <p className="text-lg font-bold text-white sm:text-xl">
            {active ? 'Ready to scan' : 'Scanner paused'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">
            {active
              ? 'Aim the desktop QR scanner at the pass. Keep this window focused — scans are accepted automatically.'
              : 'Return to this screen to scan the next pass.'}
          </p>
        </div>

        {active && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              Hardware scanner
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
              <ShieldCheck className="h-3 w-3" strokeWidth={2} aria-hidden />
              Approved passes only
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
