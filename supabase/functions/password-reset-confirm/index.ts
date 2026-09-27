import { corsHeaders, json } from '../_shared/http.ts'
import { sendMail } from '../_shared/mailer.ts'
import { checkOtp, escapeHtml, resolveResetAccount, serviceClient } from '../_shared/password-reset.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as {
      email?: unknown
      identifier?: unknown
      otp?: unknown
      new_password?: unknown
    }
    const identifier = String(body.identifier ?? body.email ?? '').trim()
    const otp = String(body.otp ?? '').trim()
    const newPassword = typeof body.new_password === 'string' ? body.new_password : ''

    if (!identifier || !otp || !newPassword) {
      return json({ error: 'Verification code and new password are required.' }, 400)
    }

    if (newPassword.length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, 400)
    }

    const admin = serviceClient()
    const account = await resolveResetAccount(admin, identifier)
    if (!account) {
      return json({ error: 'Invalid or expired verification code. Please request a new one.' }, 400)
    }

    const check = await checkOtp(admin, account.id, otp)
    if (!check.ok) return json({ error: check.error }, 400)

    if (!check.row.verified_at) {
      return json({ error: 'Please verify your code before setting a new password.' }, 400)
    }

    const { error: authError } = await admin.auth.admin.updateUserById(account.id, {
      password: newPassword,
    })
    if (authError) {
      return json({ error: authError.message || 'Could not update password.' }, 400)
    }

    await admin
      .from('email_password_reset_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', check.row.id)

    const { data: profile } = await admin
      .from('profiles')
      .update({ password_changed: true })
      .eq('id', account.id)
      .select('full_name')
      .maybeSingle()

    const name = profile?.full_name?.trim() ?? ''
    let confirmationSent = true
    try {
      await sendMail({
        to: account.email,
        subject: 'SVCE HOMS — Your password was changed',
        text: [
          name ? `Dear ${name},` : 'Hello,',
          '',
          'Your password for the SVCE Hostel Outpass System was changed successfully.',
          'If you did not make this change, contact the hostel warden office immediately.',
        ].join('\n'),
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#0f172a;line-height:1.5">
            <p>${name ? `Dear ${escapeHtml(name)},` : 'Hello,'}</p>
            <p>Your password for the SVCE Hostel Outpass System was changed successfully.</p>
            <p>If you did not make this change, contact the hostel warden office immediately.</p>
          </div>
        `,
      })
    } catch (err) {
      confirmationSent = false
      console.error('password-reset-confirm mail failure:', err)
    }

    return json({
      success: true,
      message: confirmationSent
        ? 'Your password has been updated. A confirmation email has been sent.'
        : 'Your password has been updated. You can sign in now.',
    })
  } catch (err) {
    console.error('password-reset-confirm error:', err)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
