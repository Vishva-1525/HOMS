import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAGE_SIZE = 200

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Unauthorized: missing Authorization header' }, 401)
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!jwt) {
      return jsonResponse({ success: false, error: 'Unauthorized: empty bearer token' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser(jwt)
    if (userError || !userData.user) {
      return jsonResponse({
        success: false,
        error: `Unauthorized: ${userError?.message ?? 'invalid or expired session'}`,
      }, 401)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return jsonResponse({ success: false, error: 'Forbidden: admin role required' }, 403)
    }

    let updated = 0
    let failed = 0
    const errors: Array<{ reg_number: string; message: string }> = []
    let from = 0

    while (true) {
      const { data: rows, error } = await admin
        .from('students')
        .select('id, reg_number')
        .order('reg_number', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) {
        return jsonResponse({ success: false, error: error.message })
      }

      if (!rows?.length) break

      for (const row of rows) {
        const regNumber = String(row.reg_number ?? '').trim()
        if (!regNumber) {
          failed += 1
          errors.push({
            reg_number: String(row.reg_number ?? ''),
            message: 'Missing register number',
          })
          continue
        }

        const { error: authError } = await admin.auth.admin.updateUserById(row.id, {
          password: regNumber,
        })

        if (authError) {
          failed += 1
          errors.push({ reg_number: regNumber, message: authError.message })
          continue
        }

        const { error: profileError } = await admin
          .from('profiles')
          .update({ password_changed: true })
          .eq('id', row.id)

        if (profileError) {
          failed += 1
          errors.push({
            reg_number: regNumber,
            message: `Password set but profile update failed: ${profileError.message}`,
          })
          continue
        }

        updated += 1
      }

      if (rows.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    return jsonResponse({
      success: failed === 0,
      updated,
      failed,
      errors: errors.slice(0, 50),
      message:
        `Student passwords synced to register/admission numbers. Updated ${updated}, failed ${failed}.`,
    })
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    })
  }
})
