import { ScanBarcode, ShieldCheck, Usb } from 'lucide-react'
import { GATE_CHECKPOINT_SHORT_LABELS, GATE_CHECKPOINTS } from '@/lib/gate-checkpoints'
import { cn } from '@/lib/utils'

interface HardwareScannerPanelProps {
  active: boolean
  className?: string
}

/**
 * Ready state for desk 2D USB scanners (keyboard wedge).
 * These devices do not stream live video to the browser.
 */
export function HardwareScannerPanel({ active, className }: HardwareScannerPanelProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-[min(42dvh,20rem)] flex-1 flex-col items-center justify-center overflow-hidden px-5 py-8 text-center',
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
              ? 'Aim the desk 2D QR reader at the student pass. Same QR is used for all four gates in order.'
              : 'Return to this screen to scan the next pass.'}
          </p>
        </div>

        {active && (
          <ol className="w-full space-y-1.5 rounded-2xl border border-white/20 bg-black/20 px-3 py-3 text-left">
            {GATE_CHECKPOINTS.map((cp, index) => (
              <li
                key={cp}
                className="flex items-center gap-2 text-sm font-medium text-white/90"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                  {index + 1}
                </span>
                {GATE_CHECKPOINT_SHORT_LABELS[cp]}
              </li>
            ))}
          </ol>
        )}

        {active && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
              <Usb className="h-3 w-3" strokeWidth={2} aria-hidden />
              USB 2D reader
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
              <ShieldCheck className="h-3 w-3" strokeWidth={2} aria-hidden />
              4 scans per trip
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
