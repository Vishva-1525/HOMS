import { ScanBarcode } from 'lucide-react'
import { GATE_CHECKPOINT_SHORT_LABELS, GATE_CHECKPOINTS } from '@/lib/gate-checkpoints'
import { useDeskScannerInput } from '@/hooks/security/useDeskScannerInput'
import { cn } from '@/lib/utils'

interface DeskScannerPanelProps {
  enabled: boolean
  onScan: (raw: string) => void
}

/**
 * Production primary input: USB desk QR reader (keyboard wedge) + manual fallback.
 */
export function DeskScannerPanel({ enabled, onScan }: DeskScannerPanelProps) {
  const { inputRef, handleSubmit } = useDeskScannerInput({ enabled, onScan })

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
      <form
        onSubmit={handleSubmit}
        className="space-y-2 border-b border-white/10 bg-slate-950/80 px-3 py-3"
        autoComplete="off"
      >
        <label className="sr-only" htmlFor="homs-desk-scanner-input">
          Desk QR scanner input
        </label>
        <input
          id="homs-desk-scanner-input"
          ref={inputRef}
          type="text"
          name="desk-scanner"
          data-desk-scanner-input="true"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          disabled={!enabled}
          placeholder={enabled ? 'Ready — scan with desk reader or type entry code' : 'Scanner paused'}
          className="h-12 w-full rounded-xl border border-[#1A5CA0]/40 bg-white px-3 font-mono text-base text-slate-900 shadow-sm outline-none ring-[#1A5CA0] placeholder:font-sans placeholder:text-slate-400 focus:ring-2 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!enabled}
          className="h-11 w-full rounded-xl bg-[#1A5CA0] text-sm font-bold text-white disabled:opacity-50"
        >
          Check pass
        </button>
      </form>

      <div
        className={cn(
          'relative flex min-h-[min(36dvh,18rem)] flex-1 flex-col items-center justify-center overflow-hidden px-5 py-6 text-center',
          'bg-gradient-to-br from-[#0A335C] via-[#1A5CA0] to-[#0D3F72]',
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.14)_0%,transparent_55%)]"
          aria-hidden
        />
        <div className="relative z-10 flex max-w-sm flex-col items-center gap-4">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-white shadow-lg ring-2 ring-white/15',
              enabled && 'animate-pulse',
            )}
          >
            <ScanBarcode className="h-8 w-8" strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <p className="text-lg font-bold text-white">
              {enabled ? 'Ready for desk scan' : 'Paused'}
            </p>
          </div>
          <ol className="w-full space-y-1 rounded-2xl border border-white/20 bg-black/20 px-3 py-2.5 text-left">
            {GATE_CHECKPOINTS.map((cp, index) => (
              <li key={cp} className="flex items-center gap-2 text-sm font-medium text-white/90">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold">
                  {index + 1}
                </span>
                {GATE_CHECKPOINT_SHORT_LABELS[cp]}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
