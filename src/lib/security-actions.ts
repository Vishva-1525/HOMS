import {
  GATE_CHECKPOINT_LABELS,
  GATE_CHECKPOINT_SHORT_LABELS,
  GATE_CHECKPOINTS,
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
import type { OutpassWithStudent } from '@/lib/types'

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
  step?: number
  totalSteps?: number
  cycleComplete?: boolean
  nextGateLabel?: string
  progress?: SecurityGateProgressItem[]
}

type RecordNextGateScanResponse = {
  ok?: boolean
  checkpoint?: GateCheckpoint
  step?: number
  total_steps?: number
  cycle_complete?: boolean
  completed?: string[]
  next_checkpoint?: GateCheckpoint | null
}

async function fetchPass(outpassId: string): Promise<{
  pass: OutpassWithStudent | null
  error?: string
}> {
  const passResult = await supabase
    .from('outpass_requests')
    .select('*')
    .eq('id', outpassId)
    .maybeSingle()

  if (passResult.error) {
    return { pass: null, error: passResult.error.message }
  }

  const raw = passResult.data as OutpassWithStudent | null
  if (!raw) return { pass: null }

  const profile = await fetchStudentProfileById(raw.student_id)
  return { pass: { ...raw, students: profile } }
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

    const { data: row } = await supabase
      .from('outpass_requests')
      .select('id')
      .or(`entry_code.eq.${parsed.entry_code},qr_code_data.eq.${parsed.entry_code}`)
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

function buildProgress(
  recorded: GateCheckpoint,
  completed: string[],
): SecurityGateProgressItem[] {
  const doneSet = new Set(completed)
  doneSet.add(recorded)
  return GATE_CHECKPOINTS.map((cp) => ({
    checkpoint: cp,
    label: GATE_CHECKPOINT_SHORT_LABELS[cp],
    done: doneSet.has(cp),
    justRecorded: cp === recorded,
  }))
}

/**
 * Online-only: validate QR, then let the DB record the next of 4 gate checkpoints.
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

  const { pass, error } = await fetchPass(outpassId)
  if (error) return denied('Lookup failed', error)
  if (!pass) return denied('Pass not found', 'No approved pass matches this QR.')

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

  const { data, error: recordError } = await supabase.rpc('record_next_gate_scan', {
    p_outpass_id: pass.id,
  })

  if (recordError) {
    const msg = recordError.message
    if (/already completed|already recorded for today|trip already completed/i.test(msg)) {
      return denied('Already complete', msg, identity)
    }
    if (/already scanned/i.test(msg)) {
      return denied('Already scanned', msg, identity)
    }
    if (/expired/i.test(msg)) {
      return denied('Pass expired', msg, identity)
    }
    return denied('Could not record', msg, identity)
  }

  const payload = (data ?? {}) as RecordNextGateScanResponse
  const checkpoint = payload.checkpoint
  if (!checkpoint || !GATE_CHECKPOINTS.includes(checkpoint)) {
    return denied('Could not record', 'Server did not return a gate checkpoint.', identity)
  }

  const step = payload.step ?? GATE_CHECKPOINTS.indexOf(checkpoint) + 1
  const cycleComplete = Boolean(payload.cycle_complete ?? checkpoint === 'hostel_entry')
  const next = payload.next_checkpoint ?? null
  const completed = Array.isArray(payload.completed) ? payload.completed : [checkpoint]

  return {
    outcome: 'approved',
    title: cycleComplete ? 'Trip complete' : 'Approved',
    detail: `${GATE_CHECKPOINT_LABELS[checkpoint]} · scan ${step} of 4`,
    ...identity,
    checkpoint,
    checkpointLabel: GATE_CHECKPOINT_LABELS[checkpoint],
    step,
    totalSteps: 4,
    cycleComplete,
    nextGateLabel: next ? GATE_CHECKPOINT_LABELS[next] : undefined,
    progress: buildProgress(checkpoint, completed),
  }
}
