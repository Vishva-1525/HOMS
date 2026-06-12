import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

async function sendOtpEmail(to: string, otp: string, studentName: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'HOMS <onboarding@resend.dev>'

  if (!resendKey) {
    console.warn(`[DEV] OTP for ${to}: ${otp}`)
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: 'SVCE HOMS — Password Reset OTP',
      html: `
        <p>Dear Parent/Guardian,</p>
        <p>A password reset was requested for <strong>${studentName}</strong> on the SVCE Hostel Outpass System.</p>
        <p>Your one-time password (OTP) is: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p>
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
    const { reg_number } = await req.json()

    if (!reg_number || typeof reg_number !== 'string') {
      return new Response(JSON.stringify({ error: 'Register number is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, parent_email, reg_number, profiles(full_name)')
      .eq('reg_number', reg_number.trim())
      .single()

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'No student found with that register number' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!student.parent_email) {
      return new Response(JSON.stringify({ error: 'No parent email on file for this student' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const otp = generateOtp()
    const otpHash = await hashOtp(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await supabase
      .from('password_reset_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('student_id', student.id)
      .is('used_at', null)

    const { error: insertError } = await supabase.from('password_reset_otps').insert({
      student_id: student.id,
      otp_hash: otpHash,
      expires_at: expiresAt,
    })

    if (insertError) throw insertError

    const profile = student.profiles as { full_name: string } | null
    await sendOtpEmail(student.parent_email, otp, profile?.full_name ?? student.reg_number)

    const maskedEmail = student.parent_email.replace(
      /^(.{2})(.*)(@.*)$/,
      (_: string, a: string, b: string, c: string) => `${a}${'*'.repeat(Math.min(b.length, 6))}${c}`,
    )

    return new Response(
      JSON.stringify({ success: true, message: `OTP sent to ${maskedEmail}` }),
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
