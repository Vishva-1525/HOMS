import {
  hasEntryLog,
  isPassOverdue,
  isQrEligibleStatus,
} from '@/lib/pass-filters'
import { parseScanInput } from '@/lib/pass-qr'
import { supabase } from '@/lib/supabase'
import { getStudentName, getStudentReg, getStudentAdmissionNo } from '@/lib/warden'
import type { GateLog, GateEventType, OutpassWithStudent } from '@/lib/types'

export type ScanResultKind = 'valid' | 'invalid' | 'overdue'

export interface ScanValidationResult {
  kind: ScanResultKind
  pass?: OutpassWithStudent
  gateLogs?: GateLog[]
  nextAction?: GateEventType
  reason?: string
  studentAdmissionNo?: string
}

export function getNextGateAction(gateLogs: GateLog[]): GateEventType {
  const hasExit = gateLogs.some((log) => log.event_type === 'exit')
  return hasExit ? 'entry' : 'exit'
}

export function hasExitLog(passId: string, gateLogs: GateLog[]): boolean {
  return gateLogs.some((log) => log.outpass_id === passId && log.event_type === 'exit')
}

const OUTPASS_SELECT = `
  *,
  students (
    id,
    reg_number,
    room_number,
    hostel_block,
    profiles ( full_name )
  )
`

async function enrichStudentProfile(pass: OutpassWithStudent): Promise<OutpassWithStudent> {
  if (!pass.students || pass.students.profiles?.full_name) return pass

  const studentId = pass.student_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', studentId)
    .maybeSingle()

  if (!profile?.full_name) return pass

  return {
    ...pass,
    students: {
      ...pass.students,
      profiles: { full_name: profile.full_name },
    },
  }
}

export async function fetchPassWithLogs(
  outpassId: string,
): Promise<{ pass: OutpassWithStudent | null; gateLogs: GateLog[]; error?: string }> {
  const [passResult, logsResult] = await Promise.all([
    supabase.from('outpass_requests').select(OUTPASS_SELECT).eq('id', outpassId).maybeSingle(),
    supabase.from('gate_logs').select('*').eq('outpass_id', outpassId).order('scanned_at', {
      ascending: false,
    }),
  ])

  if (passResult.error) {
    return { pass: null, gateLogs: [], error: passResult.error.message }
  }

  if (logsResult.error) {
    return { pass: null, gateLogs: [], error: logsResult.error.message }
  }

  return {
    pass: passResult.data
      ? await enrichStudentProfile(passResult.data as OutpassWithStudent)
      : null,
    gateLogs: (logsResult.data ?? []) as GateLog[],
  }
}

async function fetchStudentAdmissionNo(regNumber: string): Promise<string | undefined> {
  const { data, error } = await supabase.rpc('get_student_login_email', {
    reg_number_input: regNumber,
  })

  if (error || !data || typeof data !== 'string') return undefined
  return getStudentAdmissionNo(data)
}

export async function validateScanInput(raw: string): Promise<ScanValidationResult> {
  const parsed = parseScanInput(raw)
  if (!parsed) {
    return { kind: 'invalid', reason: 'Unrecognised QR code or pass ID.' }
  }

  const { pass, gateLogs, error } = await fetchPassWithLogs(parsed.outpass_id)
  if (error) {
    return { kind: 'invalid', reason: error }
  }

  if (!pass) {
    return { kind: 'invalid', reason: 'Pass not found or not approved.' }
  }

  const regNumber = getStudentReg(pass.students)
  const studentAdmissionNo =
    regNumber !== '—' ? await fetchStudentAdmissionNo(regNumber) : undefined

  if (!isQrEligibleStatus(pass.status)) {
    return { kind: 'invalid', reason: 'This pass is not active.' }
  }

  if (parsed.reg_number && getStudentReg(pass.students) !== parsed.reg_number) {
    return { kind: 'invalid', reason: 'Registration number does not match.', studentAdmissionNo }
  }

  if (hasEntryLog(pass.id, gateLogs)) {
    return { kind: 'invalid', reason: 'This pass has already been completed.', studentAdmissionNo }
  }

  const nextAction = getNextGateAction(gateLogs)
  const overdue = isPassOverdue(pass, gateLogs)

  if (overdue) {
    return { kind: 'overdue', pass, gateLogs, nextAction, studentAdmissionNo }
  }

  return { kind: 'valid', pass, gateLogs, nextAction, studentAdmissionNo }
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
    return { error: 'Entry has already been recorded for this pass.' }
  }

  const exitRecorded = hasExitLog(pass.id, gateLogs)
  const expectedAction = getNextGateAction(gateLogs)

  if (eventType === 'exit' && exitRecorded) {
    return { error: 'Exit has already been recorded.' }
  }

  if (eventType === 'entry' && !exitRecorded) {
    return { error: 'Record exit before allowing entry.' }
  }

  if (eventType !== expectedAction) {
    return {
      error:
        expectedAction === 'exit'
          ? 'This student must exit first.'
          : 'This student must enter — exit was already recorded.',
    }
  }

  const { error } = await supabase.from('gate_logs').insert({
    outpass_id: outpassId,
    scanned_by: scannedBy,
    event_type: eventType,
  })

  if (error) {
    return { error: error.message }
  }

  const { gateLogs: updatedLogs } = await fetchPassWithLogs(outpassId)
  return { gateLogs: updatedLogs }
}

export async function alertWardenOverdue(pass: OutpassWithStudent): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('alert_warden_overdue', {
    p_reg_number: getStudentReg(pass.students),
    p_student_name: getStudentName(pass.students),
  })

  return error ? { error: error.message } : {}
}
