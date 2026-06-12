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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2E8B44] text-2xl font-bold text-white">
          Recorded successfully
        </div>
      )}

      {phase !== 'ready-next' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-[55%] min-h-0 flex-col">
            <QrScanner active={cameraActive} onScan={handleScan} />
            {cameraActive && (
              <p className="shrink-0 bg-[#0D3F72] py-2 text-center text-sm text-white">
                Scanning for QR code…
              </p>
            )}

            {cameraActive && (
              <div className="shrink-0 bg-[#0D3F72] px-4 pb-3 text-center">
                {!manualOpen ? (
                  <button
                    type="button"
                    onClick={() => setManualOpen(true)}
                    className="text-xs text-white/80 underline underline-offset-2 hover:text-white"
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
                      className="h-10 flex-1 rounded-md border-0 px-3 text-sm text-[#1A1A2E]"
                    />
                    <button
                      type="submit"
                      className="h-10 rounded-md bg-[#1A5CA0] px-3 text-sm font-medium text-white"
                    >
                      Look up
                    </button>
                  </form>
                )}
                {manualError && (
                  <p className="mt-1 text-xs text-[#FCA5A5]">{manualError}</p>
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
            <div className="h-[45%] shrink-0 bg-[#0D3F72]" />
          )}
        </div>
      )}

      {phase === 'ready-next' && (
        <div className="flex flex-1 items-end bg-[#0D3F72] p-4">
          <button
            type="button"
            onClick={resetScan}
            className="h-16 w-full rounded-lg bg-[#1A5CA0] text-lg font-semibold text-white"
          >
            TAP TO SCAN NEXT PASS
          </button>
        </div>
      )}

      <SecurityLogOverlay open={logOpen} onClose={closeLog} />
    </div>
  )
}
