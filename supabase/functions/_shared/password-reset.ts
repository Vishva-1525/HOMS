import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const OTP_TTL_MINUTES = 10
export const MAX_OTP_ATTEMPTS = 5

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateOtp(): string {
  const [n] = crypto.getRandomValues(new Uint32Array(1))
  return String(100000 + (n % 900000))
}

export function maskEmail(email: string): string {
  return email.replace(
    /^(.{2})(.*)(@.*)$/,
    (_: string, a: string, b: string, c: string) => `${a}${'*'.repeat(Math.min(b.length, 6))}${c}`,
  )
}

export interface ResetAccount {
  id: string
  email: string
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<ResetAccount | null> {
  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const res = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    })
    if (res.ok) {
      const payload = (await res.json()) as { users?: Array<{ id: string; email?: string }> }
      const match = payload.users?.find((u) => u.email?.toLowerCase() === email)
      if (match?.email) return { id: match.id, email: match.email.toLowerCase() }
    }
  } catch {
    // fall through to pagination
  }

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) break
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (match?.email) return { id: match.id, email: match.email.toLowerCase() }
    if (data.users.length < 200) break
  }

  return null
}

/** Accepts an email address or a student register number. */
export async function resolveResetAccount(
  admin: SupabaseClient,
  identifier: string,
): Promise<ResetAccount | null> {
  const value = identifier.trim()
  if (!value) return null

  if (value.includes('@')) {
    return findAuthUserByEmail(admin, value.toLowerCase())
  }

  const { data: student } = await admin
    .from('students')
    .select('id')
    .ilike('reg_number', value.replace(/[%_\\]/g, '\\$&'))
    .maybeSingle()

  if (!student?.id) return null

  const { data, error } = await admin.auth.admin.getUserById(student.id)
  if (error || !data.user?.email) return null
  return { id: data.user.id, email: data.user.email.toLowerCase() }
}

export interface OtpRow {
  id: string
  otp_hash: string
  expires_at: string
  verified_at: string | null
  attempts: number
}

export async function latestActiveOtp(admin: SupabaseClient, userId: string): Promise<OtpRow | null> {
  const { data } = await admin
    .from('email_password_reset_otps')
    .select('id, otp_hash, expires_at, verified_at, attempts')
    .eq('user_id', userId)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as OtpRow | null) ?? null
}

export type OtpCheck = { ok: true; row: OtpRow } | { ok: false; error: string }

/** Validates a submitted code against the newest unused code, counting failed attempts. */
export async function checkOtp(admin: SupabaseClient, userId: string, otp: string): Promise<OtpCheck> {
  const row = await latestActiveOtp(admin, userId)
  if (!row) {
    return { ok: false, error: 'Invalid or expired verification code. Please request a new one.' }
  }

  if (new Date(row.expires_at) < new Date()) {
    return { ok: false, error: 'Verification code has expired. Please request a new one.' }
  }

  if (row.attempts >= MAX_OTP_ATTEMPTS) {
    return { ok: false, error: 'Too many incorrect attempts. Please request a new code.' }
  }

  if ((await hashOtp(otp.trim())) !== row.otp_hash) {
    await admin
      .from('email_password_reset_otps')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id)
    const left = MAX_OTP_ATTEMPTS - row.attempts - 1
    return {
      ok: false,
      error:
        left > 0
          ? `Incorrect verification code. ${left} attempt${left === 1 ? '' : 's'} left.`
          : 'Too many incorrect attempts. Please request a new code.',
    }
  }

  return { ok: true, row }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
