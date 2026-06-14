import { useState } from 'react'
import { Keyboard, ShieldCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { QrScanner } from '@/components/security/QrScanner'
import { ScanResultPanel } from '@/components/security/ScanResultPanel'
import { ScanValidatingOverlay } from '@/components/security/ScanValidatingOverlay'
import { SecurityLogOverlay } from '@/components/security/SecurityLogOverlay'
import { SecurityTopBar } from '@/components/security/SecurityTopBar'
import { useAuth } from '@/contexts/AuthProvider'
import { useSecurityScan } from '@/hooks/security/useSecurityScan'

export function SecurityScanPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const logOpen = location.pathname === '/security/log'

  const [manualOpen, setManualOpen] = useState(false)
  const [manualId, setManualId] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)

  const {
    phase,
    result,
    submitting,
    lastRecordedEvent,
    cameraActive,
    processScan,
    resetScan,
    recordEvent,
    alertWarden,
  } = useSecurityScan({ userId: user?.id })

  const cameraOn = cameraActive && !logOpen
  const showMainPanel = phase !== 'ready-next' && phase !== 'success-flash'
  const showCamera = phase === 'scanning'
  const showResult = phase === 'result'
  const showValidating = phase === 'validating'

  function openLog() {
    navigate('/security/log')
  }

  function closeLog() {
    navigate('/security/scan')
  }

  function handleResetScan() {
    setManualId('')
    setManualError(null)
    setManualOpen(false)
    resetScan()
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setManualError(null)

    if (!manualId.trim()) {
      setManualError('Enter a pass ID or paste QR JSON.')
      return
    }

    setManualOpen(false)
    await processScan(manualId.trim())
  }

  const successMessage =
    lastRecordedEvent === 'exit'
      ? 'Exit recorded — student may leave'
      : 'Entry recorded — student may enter'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SecurityTopBar onLogClick={openLog} />

      {phase === 'success-flash' && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700/95 px-6 text-center text-white backdrop-blur-md">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-4xl font-bold shadow-lg ring-2 ring-white/30"
            style={{ animation: 'securitySuccessPop 0.35s ease-out' }}
          >
            ✓
          </div>
          <div style={{ animation: 'securitySuccessPop 0.45s ease-out 0.05s both' }}>
            <p className="text-xl font-bold sm:text-2xl">{successMessage}</p>
            <p className="mt-1.5 text-sm text-white/85">Gate log updated</p>
          </div>
        </div>
      )}

      {showMainPanel && (
        <div className="flex min-h-0 flex-1 flex-col px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:mx-auto sm:w-full sm:max-w-lg sm:px-4 sm:pb-5 sm:pt-3">
          <div className="security-scan-card flex min-h-0 flex-1 flex-col overflow-hidden">
            {showValidating && (
              <div className="relative flex min-h-0 flex-1 flex-col">
                <ScanValidatingOverlay />
              </div>
            )}

            {showResult && (
              <ScanResultPanel
                result={result}
                visible
                submitting={submitting}
                onRecordExit={() => recordEvent('exit')}
                onRecordEntry={() => recordEvent('entry')}
                onAlertWarden={alertWarden}
                onScanAgain={handleResetScan}
              />
            )}

            {showCamera && (
              <>
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <QrScanner active={cameraOn} onScan={processScan} />
                </div>

                <div className="security-scan-dock">
                  {cameraOn && (
                    <p className="text-center text-sm font-medium text-slate-800">
                      Point camera at the student&apos;s pass QR code
                    </p>
                  )}

                  {cameraOn && (
                    <div className="mt-3">
                      {!manualOpen ? (
                        <button
                          type="button"
                          onClick={() => setManualOpen(true)}
                          className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-medium text-[#1A5CA0] shadow-sm transition-colors hover:bg-white active:scale-[0.98]"
                        >
                          <Keyboard className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                          Enter pass ID manually
                        </button>
                      ) : (
                        <form
                          onSubmit={handleManualSubmit}
                          className="mx-auto flex w-full max-w-md flex-col gap-2"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              type="text"
                              value={manualId}
                              onChange={(e) => setManualId(e.target.value)}
                              placeholder="Pass UUID or QR JSON…"
                              className="h-11 flex-1 rounded-xl border border-slate-200/80 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none ring-[#1A5CA0] focus:ring-2"
                            />
                            <button
                              type="submit"
                              className="security-action-btn h-11 shrink-0 bg-[#1A5CA0] hover:bg-[#164a85] sm:w-auto sm:px-5"
                            >
                              Look up
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setManualOpen(false)
                              setManualError(null)
                            }}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                      {manualError && (
                        <p className="mt-2 text-center text-xs font-medium text-red-700">{manualError}</p>
                      )}
                    </div>
                  )}

                  {cameraOn && (
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <span className="security-info-pill">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" strokeWidth={2} />
                        Approved passes only
                      </span>
                      <span className="security-info-pill">Exit → Entry</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'ready-next' && (
        <div className="flex flex-1 flex-col justify-end px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:mx-auto sm:w-full sm:max-w-lg sm:px-4 sm:pb-5 sm:pt-3">
          <div className="security-scan-card p-4 sm:p-5">
            <p className="dashboard-muted mb-4 text-center text-sm">{successMessage}</p>
            <button
              type="button"
              onClick={handleResetScan}
              className="security-action-btn h-14 bg-[#1A5CA0] text-base hover:bg-[#164a85] sm:h-16 sm:text-lg"
            >
              Tap to scan next pass
            </button>
          </div>
        </div>
      )}

      <SecurityLogOverlay open={logOpen} onClose={closeLog} />
    </div>
  )
}
