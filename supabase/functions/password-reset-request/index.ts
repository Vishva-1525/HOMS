import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function maskEmail(email: string): string {
  return email.replace(
    /^(.{2})(.*)(@.*)$/,
    (_: string, a: string, b: string, c: string) => `${a}${'*'.repeat(Math.min(b.length, 6))}${c}`,
  )
}

async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const normalized = email.trim().toLowerCase()

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const res = await fetch(
      `${url}/auth/v1/admin/users?email=${encodeURIComponent(normalized)}`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      },
    )
    if (res.ok) {
      const payload = await res.json() as { users?: Array<{ id: string; email?: string }> } | { id?: string; email?: string }
      if (Array.isArray((payload as { users?: unknown[] }).users)) {
        const users = (payload as { users: Array<{ id: string; email?: string }> }).users
        const match = users.find((u) => u.email?.toLowerCase() === normalized)
        if (match?.id && match.email) return { id: match.id, email: match.email }
      } else if ((payload as { id?: string }).id) {
        const single = payload as { id: string; email?: string }
        return { id: single.id, email: single.email ?? normalized }
      }
    }
  } catch {
    // fall through to pagination
  }

  let page = 1
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) break
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized)
    if (match?.id && match.email) return { id: match.id, email: match.email }
    if (data.users.length < 200) break
    page += 1
  }

  return null
}

async function sendOtpEmail(to: string, otp: string, fullName: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'HOMS <onboarding@resend.dev>'

  if (!resendKey) {
    console.warn(`[DEV] Password reset OTP for ${to}: ${otp}`)
    return
  }

  const greeting = fullName ? `Dear ${fullName},` : 'Hello,'
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: 'SVCE HOMS — Password Reset Verification Code',
      html: `
        <p>${greeting}</p>
        <p>A password reset was requested for your SVCE Hostel Outpass System account.</p>
        <p>Your verification code is:</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:16px 0">${otp}</p>
        <p>This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
      `,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to send email: ${body}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'A valid email address is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const user = await findAuthUserByEmail(supabase, normalizedEmail)

    // Always return a success-shaped response to avoid email enumeration.
    const genericMessage =
      'If an account exists for that email, a verification code has been sent.'

    if (!user) {
      return new Response(
        JSON.stringify({ success: true, message: genericMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    const otp = generateOtp()
    const otpHash = await hashOtp(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await supabase
      .from('email_password_reset_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('used_at', null)

    const { error: insertError } = await supabase.from('email_password_reset_otps').insert({
      user_id: user.id,
      email: normalizedEmail,
      otp_hash: otpHash,
      expires_at: expiresAt,
    })

    if (insertError) throw insertError

    await sendOtpEmail(normalizedEmail, otp, profile?.full_name ?? '')

    return new Response(
      JSON.stringify({
        success: true,
        message: `Verification code sent to ${maskEmail(normalizedEmail)}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
