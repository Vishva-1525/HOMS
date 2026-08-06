import { useCallback, useEffect, useRef, useState } from 'react'
import { processSecurityScan, type SecurityScanResult } from '@/lib/security-actions'
import { scanDebug } from '@/lib/security-scan-debug'

export type SecurityScanPhase = 'ready' | 'validating' | 'result'
export type SecurityScanMode = 'desk' | 'camera'

/** How long to show the approve/deny screen before accepting the next scan. */
const RESULT_DWELL_MS = 1800

/**
 * Single security scan state machine.
 * All input sources (desk HID, camera, manual) call `submitScan` only.
 */
export function useSecurityScanController() {
  const [phase, setPhase] = useState<SecurityScanPhase>('ready')
  const [mode, setMode] = useState<SecurityScanMode>('desk')
  const [result, setResult] = useState<SecurityScanResult | null>(null)
  const [cameraSession, setCameraSession] = useState(0)

  const inFlightRef = useRef(false)
  const dwellTimerRef = useRef<number | null>(null)

  const clearDwellTimer = useCallback(() => {
    if (dwellTimerRef.current != null) {
      window.clearTimeout(dwellTimerRef.current)
      dwellTimerRef.current = null
    }
  }, [])

  const goReady = useCallback(() => {
    clearDwellTimer()
    inFlightRef.current = false
    setResult(null)
    setPhase('ready')
    setCameraSession((n) => n + 1)
  }, [clearDwellTimer])

  const submitScan = useCallback(async (raw: string): Promise<boolean> => {
    const value = raw.trim()
    if (!value || inFlightRef.current) {
      scanDebug('Verification skipped', { empty: !value, inFlight: inFlightRef.current })
      return false
    }

    clearDwellTimer()
    inFlightRef.current = true
    setPhase('validating')
    setResult(null)
    scanDebug('Verification Started', value)

    try {
      const next = await processSecurityScan(value)
      scanDebug('API Response', { outcome: next.outcome, title: next.title })
      setResult(next)
      setPhase('result')
      scanDebug('Dashboard Updated')
      // Production: auto-return to ready so the next desk scan needs no click.
      dwellTimerRef.current = window.setTimeout(() => {
        dwellTimerRef.current = null
        inFlightRef.current = false
        setResult(null)
        setPhase('ready')
        setCameraSession((n) => n + 1)
        scanDebug('Ready for next scan')
      }, RESULT_DWELL_MS)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not reach the server.'
      scanDebug('API failed', message)
      setResult({
        outcome: 'denied',
        title: 'Scan failed',
        detail: message,
        studentName: '-',
        regNumber: '-',
        admissionNo: '-',
        photoUrl: null,
      })
      setPhase('result')
      dwellTimerRef.current = window.setTimeout(() => {
        dwellTimerRef.current = null
        inFlightRef.current = false
        setResult(null)
        setPhase('ready')
        setCameraSession((n) => n + 1)
        scanDebug('Ready for next scan')
      }, RESULT_DWELL_MS)
      return true
    } finally {
      // Keep inFlight true until dwell ends so a burst of wedge keys cannot
      // double-submit the same student while the result is visible.
    }
  }, [clearDwellTimer])

  useEffect(() => () => clearDwellTimer(), [clearDwellTimer])

  const listening = phase === 'ready'

  function selectMode(next: SecurityScanMode) {
    setMode(next)
    if (next === 'camera') setCameraSession((n) => n + 1)
  }

  return {
    phase,
    mode,
    result,
    listening,
    cameraSession,
    submitScan,
    goReady,
    selectMode,
  }
}
