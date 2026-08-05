import { useCallback, useState } from 'react'
import {
  alertWardenOverdue,
  checkpointLabel,
  recordGateCheckpoint,
  validateScanInput,
  type ScanValidationResult,
} from '@/lib/security-actions'
import type { GateCheckpoint } from '@/lib/gate-checkpoints'

export type SecurityScanPhase =
  | 'scanning'
  | 'validating'
  | 'result'
  | 'success-flash'
  | 'ready-next'

interface UseSecurityScanOptions {
  userId: string | undefined
  onRecorded?: (checkpoint: GateCheckpoint) => void
  onAfterRecord?: () => void
  onAfterValidate?: () => void
}

export function useSecurityScan({
  userId,
  onRecorded,
  onAfterRecord,
  onAfterValidate,
}: UseSecurityScanOptions) {
  const [phase, setPhase] = useState<SecurityScanPhase>('scanning')
  const [result, setResult] = useState<ScanValidationResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lastRecordedCheckpoint, setLastRecordedCheckpoint] = useState<GateCheckpoint | null>(null)

  const resetScan = useCallback(() => {
    setResult(null)
    setLastRecordedCheckpoint(null)
    setPhase('scanning')
  }, [])

  const processScan = useCallback(async (raw: string): Promise<ScanValidationResult> => {
    const trimmed = raw.trim()
    if (!trimmed) {
      const empty: ScanValidationResult = {
        kind: 'invalid',
        scanPhase: 'exit',
        reason: 'Empty scan input.',
      }
      setResult(empty)
      setPhase('result')
      return empty
    }

    setPhase('validating')
    setResult(null)

    try {
      let validation = await validateScanInput(trimmed)

      if (validation.requiresWardenAlert && validation.pass) {
        const { error } = await alertWardenOverdue(validation.pass, {
          overdueMs: validation.overdueMs,
          extensionPending: validation.extensionPending,
        })
        validation = {
          ...validation,
          wardenNotified: !error,
          reason: error ? `Warden alert failed: ${error}` : validation.reason,
        }
      }

      setResult(validation)
      setPhase('result')
      onAfterValidate?.()
      return validation
    } catch {
      const failed: ScanValidationResult = {
        kind: 'invalid',
        scanPhase: 'exit',
        reason: 'Failed to validate pass. Try again.',
      }
      setResult(failed)
      setPhase('result')
      return failed
    }
  }, [])

  const recordCheckpoint = useCallback(
    async (checkpoint?: GateCheckpoint) => {
      if (!userId || !result?.pass) return
      const target = checkpoint ?? result.nextCheckpoint
      if (!target) return

      setSubmitting(true)
      const { error, gateLogs } = await recordGateCheckpoint(result.pass.id, target, {
        scannedBy: userId,
      })
      setSubmitting(false)

      if (error) {
        const kind =
          /already scanned|already recorded|cycle/i.test(error)
            ? 'duplicate-checkpoint'
            : /sequence|must|next required/i.test(error)
              ? 'out-of-sequence'
              : 'invalid'

        setResult({
          kind,
          scanPhase: result.scanPhase,
          reason: error,
          pass: result.pass,
          gateLogs: gateLogs ?? result.gateLogs,
          extensions: result.extensions,
          studentAdmissionNo: result.studentAdmissionNo,
          scannerNames: result.scannerNames,
          nextCheckpoint: result.nextCheckpoint,
          nextAction: result.nextAction,
        })
        setPhase('result')
        return
      }

      if (gateLogs) {
        setResult({
          ...result,
          gateLogs,
        })
      }

      setLastRecordedCheckpoint(target)
      onRecorded?.(target)
      onAfterRecord?.()
      setPhase('success-flash')
      window.setTimeout(() => setPhase('ready-next'), 2000)
    },
    [userId, result, onRecorded, onAfterRecord],
  )

  const alertWarden = useCallback(async () => {
    if (!result?.pass) return

    setSubmitting(true)
    const { error } = await alertWardenOverdue(result.pass, {
      overdueMs: result.overdueMs,
      extensionPending: result.extensionPending,
    })
    setSubmitting(false)

    if (error) {
      setResult({ ...result, kind: 'invalid', reason: error })
      setPhase('result')
      return
    }

    setResult({ ...result, wardenNotified: true })
  }, [result])

  const scannerActive = phase === 'scanning'

  return {
    phase,
    result,
    submitting,
    lastRecordedCheckpoint,
    lastRecordedEvent: lastRecordedCheckpoint,
    lastRecordedLabel: lastRecordedCheckpoint
      ? checkpointLabel(lastRecordedCheckpoint)
      : null,
    scannerActive,
    /** @deprecated use scannerActive — camera preview removed in favor of hardware scanner */
    cameraActive: scannerActive,
    processScan,
    resetScan,
    recordCheckpoint,
    /** @deprecated use recordCheckpoint */
    recordEvent: recordCheckpoint,
    alertWarden,
  }
}
