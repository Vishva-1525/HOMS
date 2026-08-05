import {
  GATE_CHECKPOINT_LABELS,
  buildCheckpointProgress,
  getNextCheckpoint,
  isCheckpointCycleComplete,
  type GateCheckpoint,
} from '@/lib/gate-checkpoints'
import { formatOverdueDuration } from '@/lib/pass-filters'
import { parseScanInput } from '@/lib/pass-qr'
import { validatePassScanOffline } from '@/lib/offline/security-offline'
import { supabase } from '@/lib/supabase'
import { getStudentName, getStudentReg } from '@/lib/warden'
import {
  fetchAdmissionNoByStudentId,
  fetchStudentProfileById,
} from '@/lib/student-details'
import type { ExtensionRequest, GateLog, OutpassWithStudent } from '@/lib/types'

export type ScanResultKind =
  | 'valid'
  | 'invalid'
  | 'late-entry'
  | 'overdue-entry'
  | 'duplicate-checkpoint'
  | 'out-of-sequence'
  | 'cycle-complete'

export type ScanPhase = 'exit' | 'entry'

export interface ScanValidationResult {
  kind: ScanResultKind
  scanPhase: ScanPhase
  pass?: OutpassWithStudent
  gateLogs?: GateLog[]
  extensions?: ExtensionRequest[]
  nextCheckpoint?: GateCheckpoint | null
  nextAction?: GateCheckpoint | null
  reason?: string
  studentAdmissionNo?: string
  extensionApproved?: boolean
  extensionPending?: boolean
  overdueMs?: number
  requiresWardenAlert?: boolean
  wardenNotified?: boolean
  scannerNames?: Record<string, string>
}

/** @deprecated Prefer getNextCheckpoint from gate-checkpoints. */
export function getNextGateAction(
  passId: string,
  gateLogs: GateLog[],
  multiDaily = false,
): GateCheckpoint | null {
  return getNextCheckpoint(passId, gateLogs, { multiDaily })
}

export function hasExitLog(passId: string, gateLogs: GateLog[]): boolean {
  return gateLogs.some(
    (log) =>
      log.outpass_id === passId
      && (log.checkpoint === 'hostel_exit'
        || log.checkpoint === 'main_exit'
        || (!log.checkpoint && log.event_type === 'exit')),
  )
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
  return validateScanInputOnline(raw)
}

async function validateScanInputOnline(raw: string): Promise<ScanValidationResult> {
  const parsed = parseScanInput(raw)
  if (!parsed) {
    return {
      kind: 'invalid',
      scanPhase: 'exit',
      reason: 'Unrecognised QR code, pass ID, or entry code.',
    }
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

  return validatePassScanOffline(
    parsed,
    pass,
    gateLogs,
    extensions,
    studentAdmissionNo,
    scannerNames,
  )
}

export async function recordGateCheckpoint(
  outpassId: string,
  checkpoint: GateCheckpoint,
  _options?: { scannedBy?: string },
): Promise<{ error?: string; gateLogs?: GateLog[] }> {
  const { error } = await supabase.rpc('record_gate_scan', {
    p_outpass_id: outpassId,
    p_checkpoint: checkpoint,
  })

  if (error) {
    return { error: error.message }
  }

  const { gateLogs: updatedLogs, error: fetchError } = await fetchPassWithLogs(outpassId)
  if (fetchError) {
    return { gateLogs: updatedLogs, error: fetchError }
  }
  return { gateLogs: updatedLogs }
}

/** @deprecated Use recordGateCheckpoint */
export async function recordGateEvent(
  outpassId: string,
  scannedBy: string,
  checkpoint: GateCheckpoint,
): Promise<{ error?: string; gateLogs?: GateLog[] }> {
  void scannedBy
  return recordGateCheckpoint(outpassId, checkpoint)
}

export function getScanProgress(passId: string, gateLogs: GateLog[], multiDaily = false) {
  return buildCheckpointProgress(passId, gateLogs, { multiDaily })
}

export function checkpointLabel(checkpoint: GateCheckpoint): string {
  return GATE_CHECKPOINT_LABELS[checkpoint]
}

function buildWardenAlertDetail(
  overdueMs: number | undefined,
  extensionPending: boolean | undefined,
): string {
  const parts: string[] = []

  if (overdueMs && overdueMs > 0) {
    parts.push(`${formatOverdueDuration(overdueMs)} overdue`)
  }
  if (extensionPending) {
    parts.push('extension pending - not yet approved')
  }

  return parts.join('; ') || 'Overdue return at gate'
}

export async function alertWardenOverdue(
  pass: OutpassWithStudent,
  options?: { overdueMs?: number; extensionPending?: boolean },
): Promise<{ error?: string }> {
  const name = getStudentName(pass.students)
  const detail = buildWardenAlertDetail(options?.overdueMs, options?.extensionPending)

  const { error } = await supabase.from('notifications_log').insert({
    user_id: pass.approved_by,
    type: 'overdue_return',
    title: 'Overdue return at gate',
    body: `${name} - ${detail}`,
    outpass_id: pass.id,
  })

  return { error: error?.message }
}

export { isCheckpointCycleComplete }
