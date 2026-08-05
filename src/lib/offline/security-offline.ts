import { checkpointToEventType, getNextCheckpoint } from '@/lib/gate-checkpoints'
import { evaluateEntryScan, isQrEligibleStatus } from '@/lib/pass-filters'
import { isMultiDailyScanPass, isPassWithinValidityWindow } from '@/lib/pass-multi-scan'
import { parseScanInput } from '@/lib/pass-qr'
import { getStudentReg } from '@/lib/warden'
import type { GateCheckpoint, GateLog, OutpassWithStudent } from '@/lib/types'
import {
  addOutboxItem,
  getAdmissionNo,
  getExtensionsForPass,
  getGateLogsForPass,
  getOutpassIdByEntryCode,
  getPass,
  getScannerNames,
  putGateLogs,
  type SecurityScanOutboxItem,
} from '@/lib/offline/security-db'
import type { ScanValidationResult } from '@/lib/security-actions'

function newClientId(): string {
  return crypto.randomUUID()
}

async function resolveOutpassIdOffline(
  parsed: NonNullable<ReturnType<typeof parseScanInput>>,
): Promise<string | null> {
  if (parsed.outpass_id) return parsed.outpass_id
  if (parsed.entry_code) return getOutpassIdByEntryCode(parsed.entry_code)
  return null
}

export function validatePassScanOffline(
  parsed: NonNullable<ReturnType<typeof parseScanInput>>,
  pass: OutpassWithStudent,
  gateLogs: GateLog[],
  extensions: Awaited<ReturnType<typeof getExtensionsForPass>>,
  studentAdmissionNo: string | undefined,
  scannerNames: Record<string, string>,
): ScanValidationResult {
  const multi = isMultiDailyScanPass(pass)

  const base = {
    pass,
    gateLogs,
    extensions,
    studentAdmissionNo,
    scannerNames,
  }

  if (!isQrEligibleStatus(pass.status)) {
    return { ...base, kind: 'invalid', scanPhase: 'exit', reason: 'This pass is not active.' }
  }

  if (parsed.reg_number && getStudentReg(pass.students) !== parsed.reg_number) {
    return {
      ...base,
      kind: 'invalid',
      scanPhase: 'exit',
      reason: 'Registration number does not match.',
    }
  }

  if (multi && !isPassWithinValidityWindow(pass)) {
    const now = Date.now()
    const reason =
      now < new Date(pass.departure_at).getTime()
        ? 'Internship QR is not valid before departure.'
        : 'Internship QR has expired. Student must renew the pass.'
    return { ...base, kind: 'invalid', scanPhase: 'exit', reason }
  }

  const nextCheckpoint = getNextCheckpoint(pass.id, gateLogs, { multiDaily: multi })

  if (!nextCheckpoint) {
    return {
      ...base,
      kind: 'cycle-complete',
      scanPhase: 'entry',
      nextCheckpoint: null,
      nextAction: null,
      reason: multi
        ? 'All four gate scans already recorded for today.'
        : 'Pass trip already completed (Hostel Gate Entry done).',
    }
  }

  const scanPhase = checkpointToEventType(nextCheckpoint)
  const isReturnLeg = nextCheckpoint === 'main_entry' || nextCheckpoint === 'hostel_entry'

  if (nextCheckpoint === 'hostel_exit' || nextCheckpoint === 'main_exit') {
    if (!multi && Date.now() > new Date(pass.return_by).getTime()) {
      return {
        ...base,
        kind: 'invalid',
        scanPhase: 'exit',
        nextCheckpoint,
        nextAction: nextCheckpoint,
        reason: 'This pass has expired.',
      }
    }
    return {
      ...base,
      kind: 'valid',
      scanPhase,
      nextCheckpoint,
      nextAction: nextCheckpoint,
    }
  }

  const entry = evaluateEntryScan(pass, extensions)

  if (entry.kind === 'valid' || !isReturnLeg) {
    return {
      ...base,
      kind: 'valid',
      scanPhase,
      nextCheckpoint,
      nextAction: nextCheckpoint,
      extensionApproved: entry.extensionApproved,
      overdueMs: 0,
      requiresWardenAlert: false,
    }
  }

  if (entry.kind === 'late-entry') {
    return {
      ...base,
      kind: 'late-entry',
      scanPhase,
      nextCheckpoint,
      nextAction: nextCheckpoint,
      extensionPending: entry.extensionPending,
      overdueMs: entry.overdueMs,
      requiresWardenAlert: false,
    }
  }

  return {
    ...base,
    kind: 'overdue-entry',
    scanPhase,
    nextCheckpoint,
    nextAction: nextCheckpoint,
    extensionPending: entry.extensionPending,
    overdueMs: entry.overdueMs,
    requiresWardenAlert: entry.requiresWardenAlert,
  }
}

export async function validateScanInputOffline(raw: string): Promise<ScanValidationResult> {
  const parsed = parseScanInput(raw)
  if (!parsed) {
    return {
      kind: 'invalid',
      scanPhase: 'exit',
      reason: 'Unrecognised QR code, pass ID, or entry code.',
    }
  }

  const outpassId = await resolveOutpassIdOffline(parsed)
  if (!outpassId) {
    return {
      kind: 'invalid',
      scanPhase: 'exit',
      reason: parsed.entry_code
        ? 'Entry code not found in offline cache. Connect to sync.'
        : 'Pass not found in offline cache. Connect to sync.',
    }
  }

  const pass = await getPass(outpassId)
  if (!pass) {
    return {
      kind: 'invalid',
      scanPhase: 'exit',
      reason: 'Pass not found in offline cache. Connect once to download active passes.',
    }
  }

  const [gateLogs, extensions, studentAdmissionNo] = await Promise.all([
    getGateLogsForPass(outpassId),
    getExtensionsForPass(outpassId),
    getAdmissionNo(pass.student_id),
  ])

  const scannerNames = await getScannerNames(
    [...new Set(gateLogs.map((log) => log.scanned_by).filter(Boolean))],
  )

  return validatePassScanOffline(
    parsed,
    pass,
    gateLogs,
    extensions,
    studentAdmissionNo,
    scannerNames,
  )
}

export async function recordGateCheckpointOffline(
  outpassId: string,
  checkpoint: GateCheckpoint,
  scannedBy: string,
): Promise<{ gateLogs: GateLog[]; offline: true } | { error: string }> {
  const pass = await getPass(outpassId)
  if (!pass) {
    return { error: 'Pass not found in offline cache.' }
  }

  const existing = await getGateLogsForPass(outpassId)
  const multi = isMultiDailyScanPass(pass)
  const expected = getNextCheckpoint(outpassId, existing, { multiDaily: multi })

  if (!expected) {
    return { error: 'All gate scans for this pass are already complete.' }
  }

  if (expected !== checkpoint) {
    return { error: `Next required scan is ${expected.replaceAll('_', ' ')}.` }
  }

  const clientId = newClientId()
  const scannedAt = new Date().toISOString()

  const optimisticLog: GateLog = {
    id: `offline:${clientId}`,
    outpass_id: outpassId,
    scanned_by: scannedBy,
    event_type: checkpointToEventType(checkpoint),
    checkpoint,
    scanned_at: scannedAt,
    multi_daily_scan: false,
  }

  const updatedLogs = [optimisticLog, ...existing]
  await putGateLogs(updatedLogs)

  const outboxItem: SecurityScanOutboxItem = {
    client_id: clientId,
    outpass_id: outpassId,
    checkpoint,
    scanned_at: scannedAt,
    scanned_by: scannedBy,
    status: 'pending',
    retry_count: 0,
  }
  await addOutboxItem(outboxItem)

  return { gateLogs: updatedLogs, offline: true }
}
