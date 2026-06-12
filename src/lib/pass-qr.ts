import type { OutpassRequest, PassType } from '@/lib/types'

export interface PassQrPayload {
  outpass_id: string
  student_id: string
  reg_number: string
  pass_type: PassType
  departure_at: string
  return_by: string
  status: string
}

export function buildPassQrPayload(
  pass: OutpassRequest,
  regNumber: string,
): PassQrPayload {
  return {
    outpass_id: pass.id,
    student_id: pass.student_id,
    reg_number: regNumber,
    pass_type: pass.pass_type,
    departure_at: pass.departure_at,
    return_by: pass.return_by,
    status: pass.status,
  }
}

export function buildPassQrValue(pass: OutpassRequest, regNumber: string): string {
  return JSON.stringify(buildPassQrPayload(pass, regNumber))
}
