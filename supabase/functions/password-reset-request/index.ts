import { corsHeaders, json } from '../_shared/http.ts'
import { MailNotConfiguredError, sendMail } from '../_shared/mailer.ts'
import {
  escapeHtml,
  generateOtp,
  hashOtp,
  maskEmail,
  OTP_TTL_MINUTES,
  resolveResetAccount,
  serviceClient,
} from '../_shared/password-reset.ts'

const RESEND_COOLDOWN_SECONDS = 60
const MAX_REQUESTS_PER_HOUR = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as { email?: unknown; identifier?: unknown }
    const identifier = String(body.identifier ?? body.email ?? '').trim()

    if (!identifier) {
      return json({ error: 'Enter your email address or register number.' }, 400)
    }

    const admin = serviceClient()
    const account = await resolveResetAccount(admin, identifier)

    if (!account) {
      return json(
        {
          error: identifier.includes('@')
            ? 'No account found for that email. Check the spelling or use your register number.'
            : 'No account found for that register number. Check it or use your email address.',
        },
        404,
      )
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recent } = await admin
      .from('email_password_reset_otps')
      .select('created_at')
      .eq('user_id', account.id)
      .gte('created_at', hourAgo)
      .order('created_at', { ascending: false })

    const recentRows = recent ?? []
    if (recentRows.length > 0) {
      const secondsSince = (Date.now() - new Date(recentRows[0].created_at).getTime()) / 1000
      if (secondsSince < RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince)
        return json({ error: `Please wait ${wait} seconds before requesting another code.` }, 429)
      }
    }
    if (recentRows.length >= MAX_REQUESTS_PER_HOUR) {
      return json({ error: 'Too many code requests. Please try again in an hour.' }, 429)
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', account.id)
      .maybeSingle()

    const otp = generateOtp()
    const now = new Date()

    await admin
      .from('email_password_reset_otps')
      .update({ used_at: now.toISOString() })
      .eq('user_id', account.id)
      .is('used_at', null)

    const { data: inserted, error: insertError } = await admin
      .from('email_password_reset_otps')
      .insert({
        user_id: account.id,
        email: account.email,
        otp_hash: await hashOtp(otp),
        expires_at: new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    const name = profile?.full_name?.trim() ?? ''
    const greeting = name ? `Dear ${escapeHtml(name)},` : 'Hello,'

    try {
      await sendMail({
        to: account.email,
        subject: 'SVCE HOMS — Password reset code',
        text: [
          name ? `Dear ${name},` : 'Hello,',
          '',
          'A password reset was requested for your SVCE Hostel Outpass System account.',
          `Your verification code is: ${otp}`,
          '',
          `This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request this, ignore this email.`,
        ].join('\n'),
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#0f172a;line-height:1.5">
            <p>${greeting}</p>
            <p>A password reset was requested for your SVCE Hostel Outpass System account.</p>
            <p>Your verification code is:</p>
            <p style="font-size:30px;letter-spacing:8px;font-weight:700;margin:16px 0;color:#1A5CA0">${otp}</p>
            <p>This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request this, ignore this email.</p>
          </div>
        `,
      })
    } catch (err) {
      await admin
        .from('email_password_reset_otps')
        .update({ used_at: new Date().toISOString() })
        .eq('id', inserted.id)

      console.error('password-reset-request mail failure:', err)
      return json(
        {
          error:
            err instanceof MailNotConfiguredError
              ? 'Password reset emails are temporarily unavailable. Please contact the hostel office.'
              : 'We could not send the email right now. Please try again in a few minutes.',
        },
        503,
      )
    }

    return json({
      success: true,
      email: maskEmail(account.email),
      message: `We sent a 6-digit code to ${maskEmail(account.email)}. Check your inbox (and spam folder).`,
    })
  } catch (err) {
    console.error('password-reset-request error:', err)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
