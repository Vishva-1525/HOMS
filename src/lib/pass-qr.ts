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

const ENTRY_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ENTRY_CODE_PATTERN = /^[A-Z0-9]{6,10}$/i

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const COMPACT_UUID_PATTERN = /^[0-9a-f]{32}$/i

const HYPHENATED_UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

/**
 * Gate QR payload. Prefer the short entry code (same value shown for manual
 * entry) — USB wedge scanners often drop UUID hyphens and fail the UUID path.
 * Falls back to outpass id for legacy passes without an entry code.
 */
export function buildPassQrValue(
  pass: Pick<OutpassRequest, 'id' | 'entry_code' | 'qr_code_data'>,
): string {
  const entry = pass.entry_code?.trim()
  if (entry && ENTRY_CODE_PATTERN.test(entry)) {
    return entry.toUpperCase()
  }

  const stored = pass.qr_code_data?.trim()
  if (stored) {
    if (ENTRY_CODE_PATTERN.test(stored)) return stored.toUpperCase()
    if (UUID_PATTERN.test(stored) || COMPACT_UUID_PATTERN.test(stored)) return stored
  }

  return pass.id
}

export function generateEntryCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += ENTRY_CODE_CHARS[Math.floor(Math.random() * ENTRY_CODE_CHARS.length)]
  }
  return code
}

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

/** Re-insert hyphens when a scanner strips them from a UUID. */
export function normalizeCompactUuid(raw: string): string | null {
  const compact = raw.replace(/[^0-9a-f]/gi, '')
  if (!COMPACT_UUID_PATTERN.test(compact)) return null
  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20),
  ].join('-')
}

/** Accepts entry code (preferred QR), UUID, compact UUID, or legacy QR JSON. */
export function parseScanInput(
  raw: string,
): { outpass_id?: string; entry_code?: string; reg_number?: string; kind: ScanInputKind } | null {
  // Hardware scanners often append CR/LF; some wrap values in braces/quotes.
  let trimmed = raw
    .replace(/^\uFEFF/, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
  trimmed = trimmed.replace(/^["'{[<]+/, '').replace(/["'}>\]]+$/, '').trim()
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
    // not JSON - try entry code / UUID below
  }

  const compactAlpha = trimmed.replace(/\s+/g, '')

  // Prefer short entry codes — this is what the QR now encodes.
  if (ENTRY_CODE_PATTERN.test(compactAlpha)) {
    return { entry_code: compactAlpha.toUpperCase(), kind: 'entry_code' }
  }

  const uuidMatch = trimmed.match(HYPHENATED_UUID_RE)
  if (uuidMatch) {
    return { outpass_id: uuidMatch[0], kind: 'outpass_id' }
  }

  if (UUID_PATTERN.test(trimmed)) {
    return { outpass_id: trimmed, kind: 'outpass_id' }
  }

  const fromCompact = normalizeCompactUuid(compactAlpha)
  if (fromCompact) {
    return { outpass_id: fromCompact, kind: 'outpass_id' }
  }

  return null
}
