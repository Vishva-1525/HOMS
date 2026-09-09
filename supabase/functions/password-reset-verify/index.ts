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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return new Response(JSON.stringify({ error: 'Email and verification code are required' }), {
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
      .select('id, expires_at, used_at')
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

    const { error: updateError } = await supabase
      .from('email_password_reset_otps')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpRow.id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, message: 'Verification successful' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
