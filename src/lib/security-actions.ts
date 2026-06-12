import {
  hasEntryLog,
  isPassOverdue,
  isQrEligibleStatus,
} from '@/lib/pass-filters'
import { parseScanInput } from '@/lib/pass-qr'
import { supabase } from '@/lib/supabase'
import { getStudentName, getStudentReg } from '@/lib/warden'
import type { GateLog, GateEventType, OutpassWithStudent } from '@/lib/types'

export type ScanResultKind = 'valid' | 'invalid' | 'overdue'

export interface ScanValidationResult {
  kind: ScanResultKind
  pass?: OutpassWithStudent
  gateLogs?: GateLog[]
  nextAction?: GateEventType
  reason?: string
}

const OUTPASS_SELECT = `
  *,
  students (
    reg_number,
    room_number,
    hostel_block,
    profiles ( full_name )
  )
`

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
    pass: (passResult.data as OutpassWithStudent | null) ?? null,
    gateLogs: (logsResult.data ?? []) as GateLog[],
  }
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

  if (!isQrEligibleStatus(pass.status)) {
    return { kind: 'invalid', reason: 'This pass is not active.' }
  }

  if (parsed.reg_number && getStudentReg(pass.students) !== parsed.reg_number) {
    return { kind: 'invalid', reason: 'Registration number does not match.' }
  }

  if (hasEntryLog(pass.id, gateLogs)) {
    return { kind: 'invalid', reason: 'This pass has already been used.' }
  }

  if (isPassOverdue(pass, gateLogs)) {
    return { kind: 'overdue', pass, gateLogs }
  }

  const hasExit = gateLogs.some((log) => log.event_type === 'exit')
  const nextAction: GateEventType = hasExit ? 'entry' : 'exit'

  return { kind: 'valid', pass, gateLogs, nextAction }
}

export async function recordGateEvent(
  outpassId: string,
  scannedBy: string,
  eventType: GateEventType,
): Promise<{ error?: string }> {
  const { error } = await supabase.from('gate_logs').insert({
    outpass_id: outpassId,
    scanned_by: scannedBy,
    event_type: eventType,
  })

  return error ? { error: error.message } : {}
}

export async function alertWardenOverdue(pass: OutpassWithStudent): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('alert_warden_overdue', {
    p_reg_number: getStudentReg(pass.students),
    p_student_name: getStudentName(pass.students),
  })

  return error ? { error: error.message } : {}
}
