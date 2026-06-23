import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DispatchBody {
  notification_id?: string
  secret?: string
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case 'pending':
      return 'New outpass request'
    case 'approved':
      return 'Request approved'
    case 'rejected':
      return 'Request rejected'
    case 'extension':
      return 'Extension request'
    case 'overdue':
      return 'Overdue alert'
    default:
      return 'HOMS — SVCE Hostel'
  }
}

function getNotificationUrl(role: string, type: string): string {
  if (role === 'warden') {
    if (type === 'extension') return '/warden/extensions'
    if (type === 'pending') return '/warden/pending'
    return '/warden/dashboard'
  }
  if (role === 'student') return '/student/passes'
  if (role === 'parent') return '/parent/dashboard'
  return '/'
}

async function isSmsEnabled(admin: ReturnType<typeof createClient>): Promise<boolean> {
  const { data } = await admin
    .from('system_settings')
    .select('value')
    .eq('key', 'sms_notifications_enabled')
    .maybeSingle()
  return data?.value === 'true'
}

async function sendSms(phone: string, message: string): Promise<boolean> {
  const authKey = Deno.env.get('MSG91_AUTH_KEY')
  const sender = Deno.env.get('MSG91_SENDER_ID') ?? 'SVCEHM'

  if (!authKey || !phone.trim()) {
    console.warn(`[DEV SMS] ${phone}: ${message}`)
    return false
  }

  const normalized = phone.replace(/\D/g, '')
  if (normalized.length < 10) return false

  const mobile = normalized.length === 10 ? `91${normalized}` : normalized
  const legacyUrl =
    `https://api.msg91.com/api/sendhttp.php?authkey=${encodeURIComponent(authKey)}` +
    `&mobiles=${encodeURIComponent(mobile)}` +
    `&message=${encodeURIComponent(message)}` +
    `&sender=${encodeURIComponent(sender)}` +
    `&route=4&country=91`

  const response = await fetch(legacyUrl)
  return response.ok
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const body = (await req.json()) as DispatchBody
    if (!body.notification_id) {
      return new Response(JSON.stringify({ error: 'notification_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: secretRow } = await admin
      .from('system_settings')
      .select('value')
      .eq('key', 'notification_dispatch_secret')
      .maybeSingle()

    if (body.secret && secretRow?.value && body.secret !== secretRow.value) {
      return new Response(JSON.stringify({ error: 'Invalid dispatch secret' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: notification, error: notifError } = await admin
      .from('notifications_log')
      .select('id, user_id, type, message')
      .eq('id', body.notification_id)
      .maybeSingle()

    if (notifError || !notification) {
      return new Response(JSON.stringify({ error: 'Notification not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('role, phone, full_name')
      .eq('id', notification.user_id)
      .maybeSingle()

    const title = getNotificationTitle(notification.type)
    const url = getNotificationUrl(profile?.role ?? 'student', notification.type)

    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hostel@svce.ac.in'

    let pushSent = 0
    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

      const { data: subscriptions } = await admin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', notification.user_id)

      const payload = JSON.stringify({
        title,
        body: notification.message,
        url,
        type: notification.type,
      })

      for (const sub of subscriptions ?? []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          )
          pushSent += 1
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode
          if (statusCode === 404 || statusCode === 410) {
            await admin
              .from('push_subscriptions')
              .delete()
              .eq('user_id', notification.user_id)
              .eq('endpoint', sub.endpoint)
          }
        }
      }
    }

    let smsSent = false
    if (await isSmsEnabled(admin)) {
      let phone = profile?.phone ?? ''
      let smsMessage = notification.message

      if (profile?.role === 'student' && (notification.type === 'approved' || notification.type === 'rejected')) {
        const { data: student } = await admin
          .from('students')
          .select('parent_phone')
          .eq('id', notification.user_id)
          .maybeSingle()
        if (student?.parent_phone) {
          phone = student.parent_phone
          smsMessage = `SVCE HOMS: ${notification.message}`
        }
      }

      if (phone.trim()) {
        smsSent = await sendSms(phone, smsMessage)
        await admin.from('sms_log').insert({
          phone,
          message: smsMessage,
          status: smsSent ? 'sent' : 'failed',
          provider: 'msg91',
        })
      }
    }

    await admin
      .from('notification_outbox')
      .update({ processed_at: new Date().toISOString(), error_message: null })
      .eq('notification_id', notification.id)

    return new Response(
      JSON.stringify({ ok: true, push_sent: pushSent, sms_sent: smsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dispatch failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
