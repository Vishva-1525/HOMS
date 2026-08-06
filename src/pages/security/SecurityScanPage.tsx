import { Camera, LogOut, ScanBarcode } from 'lucide-react'
import { DeskScannerPanel } from '@/components/security/DeskScannerPanel'
import { SecurityCameraPanel } from '@/components/security/SecurityCameraPanel'
import { SecurityResultScreen } from '@/components/security/SecurityResultScreen'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { useAuth } from '@/contexts/AuthProvider'
import { useCameraQrScanner } from '@/hooks/security/useCameraQrScanner'
import { useSecurityScanController } from '@/hooks/security/useSecurityScanController'
import { SVCE_APP_SHORT } from '@/lib/branding'
import { cn } from '@/lib/utils'

/**
 * Security gate scanner.
 *
 * Production primary input = USB desk reader (keyboard wedge).
 * Phone camera = developer testing only.
 * Manual entry shares the same desk input field / Check pass button.
 *
 * All three call `submitScan` → `processSecurityScan` (single verification pipeline).
 */
export function SecurityScanPage() {
  const { profile, signOut } = useAuth()
  const {
    phase,
    mode,
    result,
    listening,
    cameraSession,
    submitScan,
    goReady,
    selectMode,
  } = useSecurityScanController()

  const { videoRef, error: cameraError, starting } = useCameraQrScanner({
    enabled: listening && mode === 'camera',
    sessionKey: cameraSession,
    onScan: (raw) => {
      void submitScan(raw)
    },
  })

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#0B1220] text-white">
      {phase === 'result' && result && (
        <div className="absolute inset-0 z-50">
          <SecurityResultScreen result={result} onScanNext={goReady} />
        </div>
      )}

      {phase === 'validating' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-[#0B1220]/95">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-emerald-400" />
          <p className="text-lg font-semibold">Checking pass…</p>
        </div>
      )}

      <header className="flex items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2">
          <SvceEmblem size="sm" withRing />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-semibold">{SVCE_APP_SHORT}</p>
            <p className="truncate text-[10px] text-white/60">
              Gate security · desk scanner primary
            </p>
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
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => selectMode('desk')}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition',
              mode === 'desk'
                ? 'bg-white text-slate-900 shadow'
                : 'text-white/75 hover:bg-white/5',
            )}
          >
            <ScanBarcode className="h-4 w-4" strokeWidth={2} />
            Desk scanner
          </button>
          <button
            type="button"
            onClick={() => selectMode('camera')}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition',
              mode === 'camera'
                ? 'bg-white text-slate-900 shadow'
                : 'text-white/75 hover:bg-white/5',
            )}
          >
            <Camera className="h-4 w-4" strokeWidth={2} />
            Test camera
          </button>
        </div>

        {mode === 'desk' ? (
          <DeskScannerPanel
            enabled={listening}
            onScan={(raw) => {
              void submitScan(raw)
            }}
          />
        ) : (
          <>
            <SecurityCameraPanel
              videoRef={videoRef}
              starting={starting}
              error={cameraError}
            />
            <p className="mt-3 text-center text-sm text-white/65">
              Developer testing only. Production gates use the USB desk reader.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
