import {
  GATE_CHECKPOINT_LABELS,
  GATE_CHECKPOINT_SHORT_LABELS,
  GATE_CHECKPOINTS,
  checkpointIndex,
  getNextCheckpoint,
  type GateCheckpoint,
} from '@/lib/gate-checkpoints'
import { isQrEligibleStatus } from '@/lib/pass-filters'
import { isMultiDailyScanPass, isPassWithinValidityWindow } from '@/lib/pass-multi-scan'
import { parseScanInput } from '@/lib/pass-qr'
import {
  fetchAdmissionNoByStudentId,
  fetchStudentProfileById,
} from '@/lib/student-details'
import { supabase } from '@/lib/supabase'
import { getStudentAvatarUrl, getStudentName, getStudentReg } from '@/lib/warden'
import type { GateLog, OutpassWithStudent } from '@/lib/types'

export type SecurityScanOutcome = 'approved' | 'denied'

export interface SecurityGateProgressItem {
  checkpoint: GateCheckpoint
  label: string
  done: boolean
  justRecorded: boolean
}

export interface SecurityScanResult {
  outcome: SecurityScanOutcome
  title: string
  detail?: string
  studentName: string
  regNumber: string
  admissionNo: string
  photoUrl: string | null
  checkpointLabel?: string
  checkpoint?: GateCheckpoint
  /** 1–4 after a successful gate scan */
  step?: number
  totalSteps?: number
  cycleComplete?: boolean
  nextGateLabel?: string
  progress?: SecurityGateProgressItem[]
}

async function fetchPassBundle(outpassId: string): Promise<{
  pass: OutpassWithStudent | null
  gateLogs: GateLog[]
  error?: string
}> {
  const [passResult, logsResult] = await Promise.all([
    supabase.from('outpass_requests').select('*').eq('id', outpassId).maybeSingle(),
    supabase
      .from('gate_logs')
      .select('*')
      .eq('outpass_id', outpassId)
      .order('scanned_at', { ascending: false }),
  ])

  if (passResult.error) {
    return { pass: null, gateLogs: [], error: passResult.error.message }
  }
  if (logsResult.error) {
    return { pass: null, gateLogs: [], error: logsResult.error.message }
  }

  const raw = passResult.data as OutpassWithStudent | null
  if (!raw) {
    return { pass: null, gateLogs: (logsResult.data ?? []) as GateLog[] }
  }

  const profile = await fetchStudentProfileById(raw.student_id)
  return {
    pass: { ...raw, students: profile },
    gateLogs: (logsResult.data ?? []) as GateLog[],
  }
}

async function resolveOutpassId(
  parsed: NonNullable<ReturnType<typeof parseScanInput>>,
): Promise<string | null> {
  if (parsed.outpass_id) return parsed.outpass_id
  if (parsed.entry_code) {
    const { data, error } = await supabase.rpc('get_outpass_id_by_entry_code', {
      p_entry_code: parsed.entry_code,
    })
    if (!error && data) return data as string

    // Fallback: match stored qr_code_data / entry_code via table read.
    const { data: row } = await supabase
      .from('outpass_requests')
      .select('id')
      .or(
        `entry_code.eq.${parsed.entry_code},qr_code_data.eq.${parsed.entry_code}`,
      )
      .in('status', ['approved', 'extended'])
      .limit(1)
      .maybeSingle()

    return row?.id ?? null
  }
  return null
}

function denied(
  title: string,
  detail: string,
  identity?: Partial<SecurityScanResult>,
): SecurityScanResult {
  return {
    outcome: 'denied',
    title,
    detail,
    studentName: identity?.studentName ?? '-',
    regNumber: identity?.regNumber ?? '-',
    admissionNo: identity?.admissionNo ?? '-',
    photoUrl: identity?.photoUrl ?? null,
  }
}

function identityFromPass(
  pass: OutpassWithStudent,
  admissionNo?: string,
): Pick<SecurityScanResult, 'studentName' | 'regNumber' | 'admissionNo' | 'photoUrl'> {
  return {
    studentName: getStudentName(pass.students),
    regNumber: getStudentReg(pass.students),
    admissionNo: admissionNo ?? getStudentReg(pass.students),
    photoUrl: getStudentAvatarUrl(pass.students),
  }
}

/**
 * Online-only: validate QR, auto-record the next of 4 gate checkpoints when allowed.
 */
export async function processSecurityScan(raw: string): Promise<SecurityScanResult> {
  const parsed = parseScanInput(raw)
  if (!parsed) {
    return denied('Not recognised', 'Scan a valid student outpass QR code.')
  }

  const outpassId = await resolveOutpassId(parsed)
  if (!outpassId) {
    return denied(
      'Pass not found',
      parsed.entry_code ? 'Entry code is inactive or unknown.' : 'This QR is not linked to a pass.',
    )
  }

  const { pass, gateLogs, error } = await fetchPassBundle(outpassId)
  if (error) {
    return denied('Lookup failed', error)
  }
  if (!pass) {
    return denied('Pass not found', 'No approved pass matches this QR.')
  }

  const admissionNo =
    (await fetchAdmissionNoByStudentId(pass.student_id, getStudentReg(pass.students)))
    ?? getStudentReg(pass.students)
  const identity = identityFromPass(pass, admissionNo)

  if (parsed.reg_number && getStudentReg(pass.students) !== parsed.reg_number) {
    return denied('Mismatch', 'Registration number does not match this pass.', identity)
  }

  if (!isQrEligibleStatus(pass.status)) {
    return denied('Not approved', 'This pass is not active for gate exit.', identity)
  }

  const multi = isMultiDailyScanPass(pass)
  if (multi && !isPassWithinValidityWindow(pass)) {
    const now = Date.now()
    return denied(
      'QR not valid',
      now < new Date(pass.departure_at).getTime()
        ? 'Too early — before departure time.'
        : 'Internship QR has expired.',
      identity,
    )
  }

  const nextCheckpoint = getNextCheckpoint(pass.id, gateLogs, { multiDaily: multi })
  if (!nextCheckpoint) {
    return denied(
      'Already complete',
      multi
        ? 'All four gate scans are done for today.'
        : 'This trip is already complete.',
      identity,
    )
  }

  if (
    (nextCheckpoint === 'hostel_exit' || nextCheckpoint === 'main_exit')
    && !multi
    && Date.now() > new Date(pass.return_by).getTime()
  ) {
    return denied('Pass expired', 'Return time has passed. Exit is not allowed.', identity)
  }

  const { error: recordError } = await supabase.rpc('record_gate_scan', {
    p_outpass_id: pass.id,
    p_checkpoint: nextCheckpoint,
  })

  if (recordError) {
    const msg = recordError.message
    if (/already scanned|already recorded|cycle/i.test(msg)) {
      return denied('Already scanned', msg, identity)
    }
    if (/sequence|must|next required/i.test(msg)) {
      return denied('Wrong gate order', msg, identity)
    }
    return denied('Could not record', msg, identity)
  }

  const step = checkpointIndex(nextCheckpoint) + 1
  const cycleComplete = nextCheckpoint === 'hostel_entry'
  const following = GATE_CHECKPOINTS[step] ?? null

  return {
    outcome: 'approved',
    title: cycleComplete ? 'Trip complete' : 'Approved',
    detail: `${GATE_CHECKPOINT_LABELS[nextCheckpoint]} · scan ${step} of 4`,
    ...identity,
    checkpoint: nextCheckpoint,
    checkpointLabel: GATE_CHECKPOINT_LABELS[nextCheckpoint],
    step,
    totalSteps: 4,
    cycleComplete,
    nextGateLabel: following ? GATE_CHECKPOINT_LABELS[following] : undefined,
    progress: GATE_CHECKPOINTS.map((cp, index) => ({
      checkpoint: cp,
      label: GATE_CHECKPOINT_SHORT_LABELS[cp],
      done: index < step,
      justRecorded: index === step - 1,
    })),
  }
}
