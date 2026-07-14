import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

type ImportMode = 'append' | 'replace'

interface StudentImportRow {
  email: string
  reg_number: string
  full_name: string
  phone?: string
  room_number?: string
  hostel_block?: string
  department?: string
  year_of_study?: number | string
}

interface StudentUpsertRow {
  id: string
  reg_number: string
  room_number: string
  hostel_block: string
  department: string
  year_of_study: number
  parent_phone: string
  parent_email: string
  is_active: true
}

interface ImportError {
  reg_number?: string
  email?: string
  message: string
}

interface NewAccount {
  email: string
  reg_number: string
  password: string
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function firstNameToken(fullName: string): string {
  const token = fullName.trim().split(/\s+/)[0] ?? 'student'
  return token.toLowerCase().replace(/[^a-z0-9]/g, '') || 'student'
}

function generatePassword(fullName: string, regNumber: string): string {
  const base = firstNameToken(fullName)
  const suffix =
    regNumber.replace(/[^a-zA-Z0-9]/g, '').slice(-4)
    || String(Math.floor(1000 + Math.random() * 9000))
  return `${base}${suffix}`
}

function normalizeYear(value: number | string | undefined): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  if (!Number.isFinite(n) || n < 1 || n > 4) return 1
  return Math.trunc(n)
}

function isAlreadyExistsError(message: string | undefined): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return (
    lower.includes('already been registered')
    || lower.includes('already registered')
    || lower.includes('user already exists')
    || lower.includes('duplicate')
  )
}

async function findAuthUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase()

  const { data: byParent } = await admin
    .from('students')
    .select('id')
    .ilike('parent_email', normalized)
    .limit(1)
    .maybeSingle()
  if (byParent?.id) return byParent.id as string

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

/**
 * Creates (or resolves) an Auth user one at a time.
 * Must never be called concurrently — `handle_new_user` locks `profiles`.
 */
async function ensureAuthUser(
  admin: SupabaseClient,
  row: StudentImportRow,
): Promise<{ userId: string; created: boolean; password?: string }> {
  const email = row.email.trim().toLowerCase()
  const fullName = row.full_name.trim()
  const phone = (row.phone ?? '').trim()
  const password = generatePassword(fullName, row.reg_number)

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'student',
      full_name: fullName,
      phone,
    },
  })

  if (!createError && created.user) {
    // Trigger already inserted profiles; serialize profile write after Auth settles.
    const { error: profileError } = await admin.from('profiles').upsert({
      id: created.user.id,
      role: 'student',
      full_name: fullName,
      phone,
      password_changed: false,
    })
    if (profileError) {
      throw new Error(`Profile upsert failed for ${email}: ${profileError.message}`)
    }
    return { userId: created.user.id, created: true, password }
  }

  if (!isAlreadyExistsError(createError?.message)) {
    throw new Error(createError?.message ?? 'Failed to create auth user')
  }

  const existingId = await findAuthUserIdByEmail(admin, email)
  if (!existingId) {
    throw new Error(`Auth user exists for ${email} but could not resolve user id`)
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: existingId,
    role: 'student',
    full_name: fullName,
    phone,
  })
  if (profileError) {
    throw new Error(`Profile upsert failed for ${email}: ${profileError.message}`)
  }

  return { userId: existingId, created: false }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Unauthorized: missing Authorization header' })
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!jwt) {
      return jsonResponse({ success: false, error: 'Unauthorized: empty bearer token' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return jsonResponse({
        success: false,
        error: 'Server misconfigured: missing Supabase environment keys',
      })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Must pass the JWT explicitly — getUser() without args requires a local session.
    const { data: userData, error: userError } = await userClient.auth.getUser(jwt)
    if (userError || !userData.user) {
      return jsonResponse({
        success: false,
        error: `Unauthorized: ${userError?.message ?? 'invalid or expired session'}`,
      })
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
      return jsonResponse({ success: false, error: 'Forbidden: admin role required' })
    }

    const body = await req.json() as {
      importMode?: ImportMode
      students?: StudentImportRow[]
    }

    const importMode = body.importMode === 'replace' ? 'replace' : 'append'
    const students = Array.isArray(body.students) ? body.students : []

    if (students.length === 0) {
      return jsonResponse({ success: false, error: 'No students provided' })
    }

    if (students.length > 50) {
      return jsonResponse({
        success: false,
        error: 'Maximum 50 students per request. Use smaller batches from the admin app.',
      })
    }

    // ── 1. Soft-delete must fully complete before any Auth / upsert work ──
    if (importMode === 'replace') {
      const { error: archiveError, count: archivedCount } = await admin
        .from('students')
        .update({ is_active: false }, { count: 'exact' })
        .neq('id', NIL_UUID)

      if (archiveError) {
        return jsonResponse({
          success: false,
          error: `Failed to archive existing students: ${archiveError.message}`,
        })
      }

      // Explicit barrier: soft-delete transaction resolved before continuing.
      console.info(
        `bulk-import: replace mode archived ${archivedCount ?? 'unknown'} students; proceeding sequentially`,
      )
    }

    const errors: ImportError[] = []
    const newAccounts: NewAccount[] = []
    const mappedStudents: StudentUpsertRow[] = []
    const preexistingRegNumbers = new Set<string>()

    // ── 2. Sequential Auth + profile resolution (never Promise.all) ──
    for (const raw of students) {
      const email = String(raw.email ?? '').trim().toLowerCase()
      const regNumber = String(raw.reg_number ?? '').trim()
      const fullName = String(raw.full_name ?? '').trim()

      if (!email || !regNumber || !fullName) {
        errors.push({
          email: email || undefined,
          reg_number: regNumber || undefined,
          message: 'Missing required fields (email, reg_number, full_name)',
        })
        continue
      }

      if (!email.includes('@')) {
        errors.push({ email, reg_number: regNumber, message: 'Invalid email' })
        continue
      }

      try {
        const { data: existingStudent } = await admin
          .from('students')
          .select('id')
          .eq('reg_number', regNumber)
          .maybeSingle()

        let userId: string

        if (existingStudent?.id) {
          preexistingRegNumbers.add(regNumber)
          userId = existingStudent.id as string

          const { error: profileError } = await admin
            .from('profiles')
            .update({
              full_name: fullName,
              phone: String(raw.phone ?? '').trim(),
            })
            .eq('id', userId)

          if (profileError) {
            throw new Error(profileError.message)
          }
        } else {
          const ensured = await ensureAuthUser(admin, {
            email,
            reg_number: regNumber,
            full_name: fullName,
            phone: raw.phone,
          })
          userId = ensured.userId
          if (ensured.created && ensured.password) {
            newAccounts.push({
              email,
              reg_number: regNumber,
              password: ensured.password,
            })
          }
        }

        mappedStudents.push({
          id: userId,
          reg_number: regNumber,
          room_number: String(raw.room_number ?? '').trim(),
          hostel_block: String(raw.hostel_block ?? '').trim(),
          department: String(raw.department ?? '').trim(),
          year_of_study: normalizeYear(raw.year_of_study),
          parent_phone: String(raw.phone ?? '').trim(),
          parent_email: email,
          is_active: true,
        })
      } catch (err) {
        errors.push({
          email,
          reg_number: regNumber,
          message: err instanceof Error ? err.message : 'Import failed',
        })
      }
    }

    if (mappedStudents.length === 0) {
      return jsonResponse({
        success: errors.length === 0,
        importMode,
        importedCount: 0,
        updatedCount: 0,
        errorCount: errors.length,
        errors,
        newAccounts,
      })
    }

    // ── 3. Sort by unique key before bulk upsert (prevents row-lock deadlocks) ──
    mappedStudents.sort((a, b) => a.reg_number.localeCompare(b.reg_number))

    // ── 4. Single awaited bulk upsert (no concurrent / chunked upserts) ──
    const { error: upsertError } = await admin
      .from('students')
      .upsert(mappedStudents, { onConflict: 'reg_number' })

    if (upsertError) {
      return jsonResponse({
        success: false,
        importMode,
        importedCount: 0,
        updatedCount: 0,
        errorCount: errors.length + 1,
        errors: [
          ...errors,
          { message: `Bulk upsert failed: ${upsertError.message}` },
        ],
        newAccounts,
        error: `Bulk upsert failed: ${upsertError.message}`,
      })
    }

    let importedCount = 0
    let updatedCount = 0
    for (const row of mappedStudents) {
      if (preexistingRegNumbers.has(row.reg_number)) updatedCount += 1
      else importedCount += 1
    }

    return jsonResponse({
      success: true,
      importMode,
      importedCount,
      updatedCount,
      errorCount: errors.length,
      errors,
      newAccounts,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    // Return 200 so supabase-js exposes the body (non-2xx hides the message).
    return jsonResponse({ success: false, error: message })
  }
})
