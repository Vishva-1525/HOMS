import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { QrScanner } from '@/components/security/QrScanner'
import { ScanResultPanel } from '@/components/security/ScanResultPanel'
import { SecurityLogOverlay } from '@/components/security/SecurityLogOverlay'
import { SecurityTopBar } from '@/components/security/SecurityTopBar'
import { useAuth } from '@/contexts/AuthProvider'
import {
  alertWardenOverdue,
  recordGateEvent,
  validateScanInput,
  type ScanValidationResult,
} from '@/lib/security-actions'

type ScanPhase = 'scanning' | 'result' | 'success-flash' | 'ready-next'

export function SecurityScanPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const logOpen = location.pathname === '/security/log'

  const [phase, setPhase] = useState<ScanPhase>('scanning')
  const [result, setResult] = useState<ScanValidationResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualId, setManualId] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)

  const cameraActive = phase === 'scanning' && !logOpen

  const handleScan = useCallback(async (raw: string) => {
    const validation = await validateScanInput(raw)
    setResult(validation)
    setPhase('result')
  }, [])

  function resetScan() {
    setResult(null)
    setManualId('')
    setManualError(null)
    setManualOpen(false)
    setPhase('scanning')
  }

  function openLog() {
    navigate('/security/log')
  }

  function closeLog() {
    navigate('/security/scan')
  }

  async function handleRecord(eventType: 'exit' | 'entry') {
    if (!user || !result?.pass) return

    setSubmitting(true)
    const { error } = await recordGateEvent(result.pass.id, user.id, eventType)
    setSubmitting(false)

    if (error) {
      setResult({ kind: 'invalid', reason: error })
      return
    }

    setPhase('success-flash')
    window.setTimeout(() => setPhase('ready-next'), 2000)
  }

  async function handleAlertWarden() {
    if (!result?.pass) return

    setSubmitting(true)
    const { error } = await alertWardenOverdue(result.pass)
    setSubmitting(false)

    if (error) {
      setResult({ kind: 'invalid', reason: error })
      return
    }

    resetScan()
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setManualError(null)

    if (!manualId.trim()) {
      setManualError('Enter a pass ID.')
      return
    }

    const validation = await validateScanInput(manualId.trim())
    if (validation.kind === 'invalid') {
      setManualError(validation.reason ?? 'Invalid pass ID.')
      return
    }

    setResult(validation)
    setPhase('result')
    setManualOpen(false)
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <SecurityTopBar onLogClick={openLog} />

      {phase === 'success-flash' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-emerald-600/95 text-2xl font-bold text-white backdrop-blur-sm">
          Recorded successfully
        </div>
      )}

      {phase !== 'ready-next' && (
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
          <div className="glass-panel-strong flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-[1.05] flex-col">
              <QrScanner active={cameraActive} onScan={handleScan} />

              {cameraActive && (
                <p className="dashboard-muted shrink-0 border-t border-slate-200/70 bg-white/60 py-2.5 text-center text-sm">
                  Scanning for QR code…
                </p>
              )}

              {cameraActive && (
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
                    <form onSubmit={handleManualSubmit} className="mx-auto flex max-w-sm gap-2">
                      <input
                        type="text"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="Paste pass UUID…"
                        className="h-10 flex-1 rounded-xl border border-white/60 bg-white/90 px-3 text-sm text-slate-900 shadow-sm outline-none ring-[#1A5CA0] focus:ring-2"
                      />
                      <button
                        type="submit"
                        className="h-10 rounded-xl bg-[#1A5CA0] px-3 text-sm font-semibold text-white shadow-md hover:bg-[#164a85]"
                      >
                        Look up
                      </button>
                    </form>
                  )}
                  {manualError && (
                    <p className="mt-1.5 text-xs font-medium text-red-700">{manualError}</p>
                  )}
                </div>
              )}
            </div>

            {phase === 'result' ? (
              <ScanResultPanel
                result={result}
                visible
                submitting={submitting}
                onRecordExit={() => handleRecord('exit')}
                onRecordEntry={() => handleRecord('entry')}
                onAlertWarden={handleAlertWarden}
                onScanAgain={resetScan}
              />
            ) : (
              <div className="dashboard-muted flex flex-1 items-center justify-center border-t border-dashed border-slate-300/70 bg-white/40 px-6 py-8 text-center text-sm">
                Scan a student pass QR to verify exit or entry
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'ready-next' && (
        <div className="flex flex-1 flex-col justify-end px-3 pb-4 pt-3 sm:px-4 sm:pb-5">
          <div className="glass-panel-strong p-4 sm:p-5">
            <p className="dashboard-muted mb-4 text-center text-sm">
              Gate event recorded. Ready for the next student.
            </p>
            <button
              type="button"
              onClick={resetScan}
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
