import {
  evaluateEntryScan,
  formatOverdueDuration,
  hasEntryLog,
  isQrEligibleStatus,
} from '@/lib/pass-filters'
import { parseScanInput } from '@/lib/pass-qr'
import { supabase } from '@/lib/supabase'
import { getStudentName, getStudentReg } from '@/lib/warden'
import {
  fetchAdmissionNoByStudentId,
  fetchStudentProfileById,
} from '@/lib/student-details'
import type { ExtensionRequest, GateLog, GateEventType, OutpassWithStudent } from '@/lib/types'

export type ScanResultKind =
  | 'valid'
  | 'invalid'
  | 'late-entry'
  | 'overdue-entry'
  | 'duplicate-exit'
  | 'duplicate-entry'
export type ScanPhase = 'exit' | 'entry'

export interface ScanValidationResult {
  kind: ScanResultKind
  scanPhase: ScanPhase
  pass?: OutpassWithStudent
  gateLogs?: GateLog[]
  extensions?: ExtensionRequest[]
  nextAction?: GateEventType
  reason?: string
  studentAdmissionNo?: string
  extensionApproved?: boolean
  extensionPending?: boolean
  overdueMs?: number
  requiresWardenAlert?: boolean
  wardenNotified?: boolean
  scannerNames?: Record<string, string>
}

export function getNextGateAction(gateLogs: GateLog[]): GateEventType {
  const hasExit = gateLogs.some((log) => log.event_type === 'exit')
  return hasExit ? 'entry' : 'exit'
}

export function hasExitLog(passId: string, gateLogs: GateLog[]): boolean {
  return gateLogs.some((log) => log.outpass_id === passId && log.event_type === 'exit')
}

const OUTPASS_SELECT = '*'

async function attachStudentDetails(pass: OutpassWithStudent): Promise<OutpassWithStudent> {
  const profile = await fetchStudentProfileById(pass.student_id)
  if (!profile) return pass

  return {
    ...pass,
    students: profile,
  }
}

async function fetchExtensions(outpassId: string): Promise<ExtensionRequest[]> {
  const { data, error } = await supabase
    .from('extension_requests')
    .select('*')
    .eq('outpass_id', outpassId)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as ExtensionRequest[]
}

async function fetchScannerNames(gateLogs: GateLog[]): Promise<Record<string, string>> {
  const ids = [...new Set(gateLogs.map((log) => log.scanned_by).filter(Boolean))]
  if (ids.length === 0) return {}

  const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids)
  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    map[row.id] = row.full_name
  }
  return map
}

export async function fetchPassWithLogs(
  outpassId: string,
): Promise<{
  pass: OutpassWithStudent | null
  gateLogs: GateLog[]
  extensions: ExtensionRequest[]
  error?: string
}> {
  const [passResult, logsResult, extensions] = await Promise.all([
    supabase.from('outpass_requests').select(OUTPASS_SELECT).eq('id', outpassId).maybeSingle(),
    supabase.from('gate_logs').select('*').eq('outpass_id', outpassId).order('scanned_at', {
      ascending: false,
    }),
    fetchExtensions(outpassId),
  ])

  if (passResult.error) {
    return { pass: null, gateLogs: [], extensions: [], error: passResult.error.message }
  }

  if (logsResult.error) {
    return { pass: null, gateLogs: [], extensions: [], error: logsResult.error.message }
  }

  return {
    pass: passResult.data
      ? await attachStudentDetails(passResult.data as OutpassWithStudent)
      : null,
    gateLogs: (logsResult.data ?? []) as GateLog[],
    extensions,
  }
}

async function resolveOutpassIdFromInput(
  parsed: NonNullable<ReturnType<typeof parseScanInput>>,
): Promise<string | null> {
  if (parsed.outpass_id) return parsed.outpass_id

  if (parsed.entry_code) {
    const { data, error } = await supabase.rpc('get_outpass_id_by_entry_code', {
      p_entry_code: parsed.entry_code,
    })
    if (error || !data) return null
    return data as string
  }

  return null
}

async function fetchStudentAdmissionNoForPass(
  pass: OutpassWithStudent,
): Promise<string | undefined> {
  return fetchAdmissionNoByStudentId(pass.student_id, getStudentReg(pass.students))
}

export async function validateScanInput(raw: string): Promise<ScanValidationResult> {
  const parsed = parseScanInput(raw)
  if (!parsed) {
    return { kind: 'invalid', scanPhase: 'exit', reason: 'Unrecognised QR code, pass ID, or entry code.' }
  }

  const outpassId = await resolveOutpassIdFromInput(parsed)
  if (!outpassId) {
    return {
      kind: 'invalid',
      scanPhase: 'exit',
      reason: parsed.entry_code ? 'Entry code not found or pass is inactive.' : 'Pass not found.',
    }
  }

  const { pass, gateLogs, extensions, error } = await fetchPassWithLogs(outpassId)
  if (error) {
    return { kind: 'invalid', scanPhase: 'exit', reason: error }
  }

  if (!pass) {
    return { kind: 'invalid', scanPhase: 'exit', reason: 'Pass not found or not approved.' }
  }

  const scannerNames = await fetchScannerNames(gateLogs)
  const studentAdmissionNo = await fetchStudentAdmissionNoForPass(pass)

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

  if (hasEntryLog(pass.id, gateLogs)) {
    return {
      ...base,
      kind: 'duplicate-entry',
      scanPhase: 'entry',
      reason: 'Student already entered.',
    }
  }

  const nextAction = getNextGateAction(gateLogs)

  if (nextAction === 'exit') {
    return {
      ...base,
      kind: 'valid',
      scanPhase: 'exit',
      nextAction,
    }
  }

  const entry = evaluateEntryScan(pass, extensions)

  if (entry.kind === 'valid') {
    return {
      ...base,
      kind: 'valid',
      scanPhase: 'entry',
      nextAction,
      extensionApproved: entry.extensionApproved,
      overdueMs: 0,
      requiresWardenAlert: false,
    }
  }

  if (entry.kind === 'late-entry') {
    return {
      ...base,
      kind: 'late-entry',
      scanPhase: 'entry',
      nextAction,
      extensionPending: entry.extensionPending,
      overdueMs: entry.overdueMs,
      requiresWardenAlert: false,
    }
  }

  return {
    ...base,
    kind: 'overdue-entry',
    scanPhase: 'entry',
    nextAction,
    extensionPending: entry.extensionPending,
    overdueMs: entry.overdueMs,
    requiresWardenAlert: entry.requiresWardenAlert,
  }
}

export async function recordGateEvent(
  outpassId: string,
  scannedBy: string,
  eventType: GateEventType,
): Promise<{ error?: string; gateLogs?: GateLog[] }> {
  const { pass, gateLogs, error: fetchError } = await fetchPassWithLogs(outpassId)
  if (fetchError) {
    return { error: fetchError }
  }

  if (!pass) {
    return { error: 'Pass not found or not approved.' }
  }

  if (!isQrEligibleStatus(pass.status)) {
    return { error: 'This pass is no longer active.' }
  }

  if (hasEntryLog(pass.id, gateLogs)) {
    return { error: 'Student already entered.' }
  }

  const exitRecorded = hasExitLog(pass.id, gateLogs)
  const expectedAction = getNextGateAction(gateLogs)

  if (eventType === 'exit' && exitRecorded) {
    return { error: 'Student already exited.' }
  }

  if (eventType === 'entry' && !exitRecorded) {
    return { error: 'Record exit before allowing entry.' }
  }

  if (eventType !== expectedAction) {
    return {
      error:
        expectedAction === 'exit'
          ? 'This student must exit first.'
          : 'Student already exited — record entry on return.',
    }
  }

  const { error } = await supabase.from('gate_logs').insert({
    outpass_id: outpassId,
    scanned_by: scannedBy,
    event_type: eventType,
  })

  if (error) {
    if (error.code === '23505') {
      return {
        error:
          eventType === 'exit' ? 'Student already exited.' : 'Student already entered.',
      }
    }
    return { error: error.message }
  }

  const { gateLogs: updatedLogs } = await fetchPassWithLogs(outpassId)
  return { gateLogs: updatedLogs }
}

function buildWardenAlertDetail(
  overdueMs: number | undefined,
  extensionPending: boolean | undefined,
): string {
  const parts: string[] = []

  if (overdueMs && overdueMs > 0) {
    parts.push(`Late by ${formatOverdueDuration(overdueMs)}`)
  }

  if (extensionPending) {
    parts.push('extension pending — not yet approved')
  } else {
    parts.push('no approved extension on file')
  }

  return parts.join('; ')
}

export async function alertWardenOverdue(
  pass: OutpassWithStudent,
  options?: { overdueMs?: number; extensionPending?: boolean },
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('alert_warden_overdue', {
    p_reg_number: getStudentReg(pass.students),
    p_student_name: getStudentName(pass.students),
    p_detail: buildWardenAlertDetail(options?.overdueMs, options?.extensionPending),
  })

  return error ? { error: error.message } : {}
}
