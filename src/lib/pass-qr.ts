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

const ENTRY_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateEntryCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += ENTRY_CODE_CHARS[Math.floor(Math.random() * ENTRY_CODE_CHARS.length)]
  }
  return code
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ENTRY_CODE_PATTERN = /^[A-Z0-9]{6,10}$/i

export type ScanInputKind = 'outpass_id' | 'entry_code'

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

/** Accepts full QR JSON, raw outpass UUID, or entry code for manual entry. */
export function parseScanInput(
  raw: string,
): { outpass_id?: string; entry_code?: string; reg_number?: string; kind: ScanInputKind } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as { outpass_id?: string; reg_number?: string }
    if (typeof parsed.outpass_id === 'string') {
      return {
        outpass_id: parsed.outpass_id,
        reg_number: typeof parsed.reg_number === 'string' ? parsed.reg_number : undefined,
        kind: 'outpass_id',
      }
    }
  } catch {
    // not JSON — try UUID or entry code below
  }

  if (UUID_PATTERN.test(trimmed)) {
    return { outpass_id: trimmed, kind: 'outpass_id' }
  }

  const normalized = trimmed.replace(/\s+/g, '').toUpperCase()
  if (ENTRY_CODE_PATTERN.test(normalized)) {
    return { entry_code: normalized, kind: 'entry_code' }
  }

  return null
}
