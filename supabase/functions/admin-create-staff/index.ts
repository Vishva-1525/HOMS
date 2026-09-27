import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function passwordFromFullName(fullName: string): string {
  const trimmed = fullName.trim()
  const withoutInitial = trimmed.replace(/^[A-Za-z]\.\s*/, '').trim() || trimmed
  let password = withoutInitial.toLowerCase().replace(/\s+/g, '')
  if (password.length < 6) {
    password = trimmed.toLowerCase().replace(/[.\s]+/g, '')
  }
  if (password.length < 6) {
    throw new Error(`Password derived from name is too short for ${fullName}`)
  }
  return password
}

function randomPassword(length = 14): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#%&*'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

type StaffRole = 'warden' | 'security_guard' | 'admin'

const CREATABLE_ROLES: Record<string, StaffRole[]> = {
  admin: ['warden', 'security_guard', 'admin'],
  warden: ['warden', 'security_guard'],
}

function generatePassword(fullName: string, role: StaffRole): string {
  return role === 'admin' ? randomPassword() : passwordFromFullName(fullName)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized: empty bearer token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
      return new Response(
        JSON.stringify({ error: `Unauthorized: ${userError?.message ?? 'invalid or expired session'}` }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()

    const allowedRoles = CREATABLE_ROLES[profile?.role ?? ''] ?? []
    if (allowedRoles.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json() as {
      full_name: string
      email: string
      phone: string
      role: StaffRole
      assignment_value: string
      gender?: 'male' | 'female'
    }

    const { full_name, email, phone, role, assignment_value, gender } = body
    if (!full_name?.trim() || !email?.trim() || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (role === 'warden' && gender !== 'male' && gender !== 'female') {
      return new Response(JSON.stringify({ error: 'Wardens require gender (male or female)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let password: string
    try {
      password = generatePassword(full_name, role)
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { role, full_name: full_name.trim(), phone: phone?.trim() ?? '' },
    })

    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? 'Create failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = created.user.id

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      role,
      full_name: full_name.trim(),
      phone: phone?.trim() ?? '',
      gender: role === 'warden' ? gender : null,
      password_changed: true,
    })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId)
      return new Response(JSON.stringify({ error: `Could not create profile: ${profileError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (role !== 'admin') {
      const { error: assignmentError } = await adminClient.from('staff_assignments').upsert(
        {
          profile_id: userId,
          assignment_type: role === 'warden' ? 'block' : 'gate',
          assignment_value: assignment_value?.trim() ?? '',
        },
        { onConflict: 'profile_id,assignment_type' },
      )

      if (assignmentError) {
        return new Response(
          JSON.stringify({
            user_id: userId,
            email: email.trim().toLowerCase(),
            password,
            warning: `Account created, but the assignment was not saved: ${assignmentError.message}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    return new Response(
      JSON.stringify({ user_id: userId, email: email.trim().toLowerCase(), password }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
