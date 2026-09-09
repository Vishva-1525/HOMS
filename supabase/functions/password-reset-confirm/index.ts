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

async function findAuthUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
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
      const payload = await res.json() as { users?: Array<{ id: string; email?: string }> } | { id?: string }
      if (Array.isArray((payload as { users?: unknown[] }).users)) {
        const users = (payload as { users: Array<{ id: string; email?: string }> }).users
        const match = users.find((u) => u.email?.toLowerCase() === normalized)
        if (match) return match.id
      } else if ((payload as { id?: string }).id) {
        return (payload as { id: string }).id
      }
    }
  } catch {
    // fall through
  }

  let page = 1
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) break
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized)
    if (match) return match.id
    if (data.users.length < 200) break
    page += 1
  }

  return null
}

async function sendPasswordUpdatedEmail(to: string, fullName: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'HOMS <onboarding@resend.dev>'

  if (!resendKey) {
    console.warn(`[DEV] Password updated notification for ${to}`)
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
      subject: 'SVCE HOMS — Password Updated',
      html: `
        <p>${greeting}</p>
        <p>Your password for the SVCE Hostel Outpass System has been updated successfully.</p>
        <p>If you did not make this change, contact your hostel warden office immediately.</p>
      `,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`Failed to send password-updated email: ${body}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, otp, new_password } = await req.json()

    if (!email || !otp || !new_password) {
      return new Response(
        JSON.stringify({ error: 'Email, verification code, and new password are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (typeof new_password !== 'string' || new_password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const userId = await findAuthUserIdByEmail(supabase, normalizedEmail)
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid or expired verification code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const otpHash = await hashOtp(String(otp).trim())

    const { data: otpRow, error: otpError } = await supabase
      .from('email_password_reset_otps')
      .select('id, expires_at, used_at, verified_at')
      .eq('user_id', userId)
      .eq('otp_hash', otpHash)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (otpError || !otpRow) {
      return new Response(JSON.stringify({ error: 'Invalid or expired verification code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (new Date(otpRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Verification code has expired. Please request a new one.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!otpRow.verified_at) {
      return new Response(JSON.stringify({ error: 'Please verify your code before setting a new password.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      password: new_password,
    })

    if (authError) throw authError

    await supabase
      .from('email_password_reset_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', otpRow.id)

    await supabase
      .from('profiles')
      .update({ password_changed: true })
      .eq('id', userId)

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()

    await sendPasswordUpdatedEmail(normalizedEmail, profile?.full_name ?? '')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your password has been updated. A confirmation email has been sent.',
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
