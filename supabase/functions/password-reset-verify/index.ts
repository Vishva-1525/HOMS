import { corsHeaders, json } from '../_shared/http.ts'
import { checkOtp, resolveResetAccount, serviceClient } from '../_shared/password-reset.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as { email?: unknown; identifier?: unknown; otp?: unknown }
    const identifier = String(body.identifier ?? body.email ?? '').trim()
    const otp = String(body.otp ?? '').trim()

    if (!identifier || !/^\d{6}$/.test(otp)) {
      return json({ error: 'Enter the 6-digit code from the email.' }, 400)
    }

    const admin = serviceClient()
    const account = await resolveResetAccount(admin, identifier)
    if (!account) {
      return json({ error: 'Invalid or expired verification code. Please request a new one.' }, 400)
    }

    const check = await checkOtp(admin, account.id, otp)
    if (!check.ok) return json({ error: check.error }, 400)

    const { error: updateError } = await admin
      .from('email_password_reset_otps')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', check.row.id)

    if (updateError) throw updateError

    return json({ success: true, message: 'Code verified. Create your new password.' })
  } catch (err) {
    console.error('password-reset-verify error:', err)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
