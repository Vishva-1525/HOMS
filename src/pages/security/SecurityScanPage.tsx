import { useState } from 'react'
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
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <SecurityTopBar onLogClick={openLog} />

      {phase === 'success-flash' && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-2 bg-emerald-600/95 px-6 text-center text-white backdrop-blur-sm">
          <p className="text-2xl font-bold">✓ {successMessage}</p>
          <p className="text-sm text-white/85">Gate log updated</p>
        </div>
      )}

      {showMainPanel && (
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
          <div className="glass-panel-strong flex min-h-0 flex-1 flex-col overflow-hidden">
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
                <div className="relative flex min-h-0 flex-[1.05] flex-col">
                  <QrScanner active={cameraOn} onScan={processScan} />

                  {cameraOn && (
                    <p className="dashboard-muted shrink-0 border-t border-slate-200/70 bg-white/60 py-2.5 text-center text-sm">
                      Point camera at the student&apos;s pass QR code
                    </p>
                  )}

                  {cameraOn && (
                    <div className="shrink-0 border-t border-slate-200/70 bg-white/60 px-4 py-3 text-center">
                      {!manualOpen ? (
                        <button
                          type="button"
                          onClick={() => setManualOpen(true)}
                          className="text-xs font-medium text-[#1A5CA0] underline-offset-4 hover:underline"
                        >
                          Enter pass ID manually
                        </button>
                      ) : (
                        <form
                          onSubmit={handleManualSubmit}
                          className="mx-auto flex max-w-md flex-col gap-2"
                        >
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={manualId}
                              onChange={(e) => setManualId(e.target.value)}
                              placeholder="Pass UUID or QR JSON…"
                              className="h-10 flex-1 rounded-xl border border-white/60 bg-white/90 px-3 text-sm text-slate-900 shadow-sm outline-none ring-[#1A5CA0] focus:ring-2"
                            />
                            <button
                              type="submit"
                              className="h-10 shrink-0 rounded-xl bg-[#1A5CA0] px-4 text-sm font-semibold text-white shadow-md hover:bg-[#164a85]"
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
                            className="text-xs text-slate-600 hover:text-slate-900"
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                      {manualError && (
                        <p className="mt-1.5 text-xs font-medium text-red-700">{manualError}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="dashboard-muted flex flex-1 items-center justify-center border-t border-dashed border-slate-300/70 bg-white/40 px-6 py-8 text-center text-sm">
                  Approved passes only · Scan or enter pass ID to verify exit or entry
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'ready-next' && (
        <div className="flex flex-1 flex-col justify-end px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
          <div className="glass-panel-strong p-4 sm:p-5">
            <p className="dashboard-muted mb-4 text-center text-sm">{successMessage}</p>
            <button
              type="button"
              onClick={handleResetScan}
              className="h-16 w-full rounded-xl bg-[#1A5CA0] text-lg font-semibold text-white shadow-lg transition-colors hover:bg-[#164a85]"
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
