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

/** QR encodes only the outpass UUID — gate lookup loads full pass details from the DB. */
export function buildPassQrValue(pass: OutpassRequest): string {
  return pass.id
}

export interface ScannedPassQrPayload {
  outpass_id: string
  reg_number: string
  pass_type: PassType
  departure_at: string
  return_by: string
}

export function parsePassQrValue(raw: string): ScannedPassQrPayload | null {
  try {
    const parsed = JSON.parse(raw.trim()) as Partial<ScannedPassQrPayload>
    if (typeof parsed.outpass_id !== 'string') return null

    if (
      typeof parsed.reg_number === 'string'
      && typeof parsed.pass_type === 'string'
      && typeof parsed.departure_at === 'string'
      && typeof parsed.return_by === 'string'
    ) {
      return parsed as ScannedPassQrPayload
    }

    return null
  } catch {
    return null
  }
}

/** Accepts full QR JSON or a raw outpass UUID for manual entry. */
export function parseScanInput(raw: string): { outpass_id: string; reg_number?: string } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as { outpass_id?: string; reg_number?: string }
    if (typeof parsed.outpass_id === 'string') {
      return {
        outpass_id: parsed.outpass_id,
        reg_number: typeof parsed.reg_number === 'string' ? parsed.reg_number : undefined,
      }
    }
  } catch {
    // not JSON — try UUID below
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (uuidPattern.test(trimmed)) {
    return { outpass_id: trimmed }
  }

  return null
}
