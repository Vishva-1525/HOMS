import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, LogOut, ScanBarcode } from 'lucide-react'
import { HardwareScannerCapture } from '@/components/security/HardwareScannerCapture'
import { HardwareScannerPanel } from '@/components/security/HardwareScannerPanel'
import { SecurityCameraPanel } from '@/components/security/SecurityCameraPanel'
import { SecurityResultScreen } from '@/components/security/SecurityResultScreen'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { useAuth } from '@/contexts/AuthProvider'
import { useCameraQrScanner } from '@/hooks/security/useCameraQrScanner'
import { processSecurityScan, type SecurityScanResult } from '@/lib/security-actions'
import { SVCE_APP_SHORT } from '@/lib/branding'
import { cn } from '@/lib/utils'

type Phase = 'scanning' | 'validating' | 'result'
type ScanMode = 'hardware' | 'camera'

/** Brief pause so the same physical scan cannot double-submit. */
const RESCAN_COOLDOWN_MS = 900
/** Mid-trip: return to ready so the next of 4 gates can scan without tapping. */
const AUTO_READY_AFTER_GATE_MS = 2200
/** Trip complete / denied: slightly longer so the result is readable. */
const AUTO_READY_AFTER_DONE_MS = 3500

export function SecurityScanPage() {
  const { profile, signOut } = useAuth()
  const [phase, setPhase] = useState<Phase>('scanning')
  const [mode, setMode] = useState<ScanMode>('hardware')
  const [result, setResult] = useState<SecurityScanResult | null>(null)
  const inFlightRef = useRef(false)

  const handleScan = useCallback(async (raw: string) => {
    if (!raw.trim() || inFlightRef.current) return
    inFlightRef.current = true
    setPhase('validating')
    setResult(null)
    try {
      const next = await processSecurityScan(raw)
      setResult(next)
      setPhase('result')
    } catch {
      setResult({
        outcome: 'denied',
        title: 'Scan failed',
        detail: 'Could not reach the server. Check internet and try again.',
        studentName: '-',
        regNumber: '-',
        admissionNo: '-',
        photoUrl: null,
      })
      setPhase('result')
    } finally {
      // Allow the next gate scan while the profile result is still visible.
      window.setTimeout(() => {
        inFlightRef.current = false
      }, RESCAN_COOLDOWN_MS)
    }
  }, [])

  function reset() {
    inFlightRef.current = false
    setResult(null)
    setPhase('scanning')
  }

  // After a gate is recorded, auto-return to ready so guards can scan the same
  // QR again for the next of the four checkpoints without pressing a button.
  useEffect(() => {
    if (phase !== 'result' || !result) return

    const midTrip = result.outcome === 'approved' && !result.cycleComplete
    const delay = midTrip ? AUTO_READY_AFTER_GATE_MS : AUTO_READY_AFTER_DONE_MS

    const timer = window.setTimeout(() => {
      setResult(null)
      setPhase('scanning')
      inFlightRef.current = false
    }, delay)

    return () => window.clearTimeout(timer)
  }, [phase, result])

  const hardwareListening =
    mode === 'hardware' && (phase === 'scanning' || phase === 'result')

  const { videoRef, error: cameraError, starting } = useCameraQrScanner({
    enabled: mode === 'camera' && phase === 'scanning',
    onScan: (raw) => void handleScan(raw),
  })

  // Hidden hardware capture stays mounted on the result screen.
  const hardwareCapture = (
    <HardwareScannerCapture
      enabled={hardwareListening}
      onScan={(raw) => void handleScan(raw)}
      className={phase === 'result' ? 'sr-only' : undefined}
    />
  )

  if (phase === 'result' && result) {
    return (
      <>
        {mode === 'hardware' && hardwareCapture}
        <SecurityResultScreen result={result} onScanNext={reset} />
      </>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0B1220] text-white">
      <header className="flex items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2">
          <SvceEmblem size="sm" withRing />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-semibold">{SVCE_APP_SHORT}</p>
            <p className="truncate text-[10px] text-white/60">Gate security · 4-step</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden truncate text-xs text-white/70 sm:inline">
            {profile?.full_name}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-medium text-white/90"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:mx-auto sm:w-full sm:max-w-lg sm:px-4">
        {phase === 'validating' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900/80">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-emerald-400" />
            <p className="text-lg font-semibold">Checking pass…</p>
          </div>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode('hardware')}
                className={cn(
                  'inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition',
                  mode === 'hardware'
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-white/75 hover:bg-white/5',
                )}
              >
                <ScanBarcode className="h-4 w-4" strokeWidth={2} />
                Desk scanner
              </button>
              <button
                type="button"
                onClick={() => setMode('camera')}
                className={cn(
                  'inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition',
                  mode === 'camera'
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-white/75 hover:bg-white/5',
                )}
              >
                <Camera className="h-4 w-4" strokeWidth={2} />
                Phone camera
              </button>
            </div>

            {mode === 'hardware' ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
                <div className="border-b border-white/10 bg-slate-950/80 px-3 py-3">
                  {hardwareCapture}
                </div>
                <HardwareScannerPanel active={phase === 'scanning'} />
              </div>
            ) : (
              <>
                <SecurityCameraPanel
                  videoRef={videoRef}
                  starting={starting}
                  error={cameraError}
                />
                <p className="mt-3 text-center text-sm text-white/65">
                  Backup only — for phones/tablets. Desk gates should use the USB 2D scanner.
                </p>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
