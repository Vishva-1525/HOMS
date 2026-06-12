import { useCallback, useState } from 'react'
import {
  alertWardenOverdue,
  recordGateEvent,
  validateScanInput,
  type ScanValidationResult,
} from '@/lib/security-actions'
import type { GateEventType } from '@/lib/types'

export type SecurityScanPhase =
  | 'scanning'
  | 'validating'
  | 'result'
  | 'success-flash'
  | 'ready-next'

interface UseSecurityScanOptions {
  userId: string | undefined
  onRecorded?: (eventType: GateEventType) => void
}

export function useSecurityScan({ userId, onRecorded }: UseSecurityScanOptions) {
  const [phase, setPhase] = useState<SecurityScanPhase>('scanning')
  const [result, setResult] = useState<ScanValidationResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lastRecordedEvent, setLastRecordedEvent] = useState<GateEventType | null>(null)

  const resetScan = useCallback(() => {
    setResult(null)
    setLastRecordedEvent(null)
    setPhase('scanning')
  }, [])

  const processScan = useCallback(async (raw: string): Promise<ScanValidationResult> => {
    const trimmed = raw.trim()
    if (!trimmed) {
      const empty: ScanValidationResult = { kind: 'invalid', reason: 'Empty scan input.' }
      setResult(empty)
      setPhase('result')
      return empty
    }

    setPhase('validating')
    setResult(null)

    try {
      const validation = await validateScanInput(trimmed)
      setResult(validation)
      setPhase('result')
      return validation
    } catch {
      const failed: ScanValidationResult = {
        kind: 'invalid',
        reason: 'Failed to validate pass. Try again.',
      }
      setResult(failed)
      setPhase('result')
      return failed
    }
  }, [])

  const recordEvent = useCallback(
    async (eventType: GateEventType) => {
      if (!userId || !result?.pass) return

      setSubmitting(true)
      const { error } = await recordGateEvent(result.pass.id, userId, eventType)
      setSubmitting(false)

      if (error) {
        setResult({ kind: 'invalid', reason: error })
        setPhase('result')
        return
      }

      setLastRecordedEvent(eventType)
      onRecorded?.(eventType)
      setPhase('success-flash')
      window.setTimeout(() => setPhase('ready-next'), 2000)
    },
    [userId, result, onRecorded],
  )

  const alertWarden = useCallback(async () => {
    if (!result?.pass) return

    setSubmitting(true)
    const { error } = await alertWardenOverdue(result.pass)
    setSubmitting(false)

    if (error) {
      setResult({ kind: 'invalid', reason: error })
      setPhase('result')
    }
  }, [result])

  const cameraActive = phase === 'scanning'

  return {
    phase,
    result,
    submitting,
    lastRecordedEvent,
    cameraActive,
    processScan,
    resetScan,
    recordEvent,
    alertWarden,
  }
}
