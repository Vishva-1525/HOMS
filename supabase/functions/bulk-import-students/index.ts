import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = 15
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
  const suffix = regNumber.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || String(Math.floor(1000 + Math.random() * 9000))
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

  // Prefer linked student row (we store login email on parent_email for imports).
  const { data: byParent } = await admin
    .from('students')
    .select('id')
    .ilike('parent_email', normalized)
    .limit(1)
    .maybeSingle()
  if (byParent?.id) return byParent.id as string

  // GoTrue admin filter (supported on hosted Supabase).
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
    // fall through to pagination
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
    await admin.from('profiles').upsert({
      id: created.user.id,
      role: 'student',
      full_name: fullName,
      phone,
      password_changed: false,
    })
    return { userId: created.user.id, created: true, password }
  }

  if (!isAlreadyExistsError(createError?.message)) {
    throw new Error(createError?.message ?? 'Failed to create auth user')
  }

  const existingId = await findAuthUserIdByEmail(admin, email)
  if (!existingId) {
    throw new Error(`Auth user exists for ${email} but could not resolve user id`)
  }

  await admin.from('profiles').upsert({
    id: existingId,
    role: 'student',
    full_name: fullName,
    phone,
  })

  return { userId: existingId, created: false }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return jsonResponse({ success: false, error: 'Forbidden' }, 403)
    }

    const body = await req.json() as {
      importMode?: ImportMode
      students?: StudentImportRow[]
    }

    const importMode = body.importMode === 'replace' ? 'replace' : 'append'
    const students = Array.isArray(body.students) ? body.students : []

    if (students.length === 0) {
      return jsonResponse({ success: false, error: 'No students provided' }, 400)
    }

    if (students.length > 2000) {
      return jsonResponse({ success: false, error: 'Maximum 2000 students per import' }, 400)
    }

    if (importMode === 'replace') {
      const { error: archiveError } = await admin
        .from('students')
        .update({ is_active: false })
        .neq('id', NIL_UUID)

      if (archiveError) {
        return jsonResponse({
          success: false,
          error: `Failed to archive existing students: ${archiveError.message}`,
        }, 500)
      }
    }

    let importedCount = 0
    let updatedCount = 0
    const errors: ImportError[] = []
    const newAccounts: NewAccount[] = []

    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE)

      for (const raw of batch) {
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

          const studentFields = {
            room_number: String(raw.room_number ?? '').trim(),
            hostel_block: String(raw.hostel_block ?? '').trim(),
            department: String(raw.department ?? '').trim(),
            year_of_study: normalizeYear(raw.year_of_study),
            parent_phone: String(raw.phone ?? '').trim(),
            parent_email: email,
            is_active: true,
          }

          if (existingStudent?.id) {
            await admin.from('profiles').update({
              full_name: fullName,
              phone: String(raw.phone ?? '').trim(),
            }).eq('id', existingStudent.id)

            const { error: upsertError } = await admin.from('students').upsert(
              {
                id: existingStudent.id as string,
                reg_number: regNumber,
                ...studentFields,
              },
              { onConflict: 'reg_number' },
            )

            if (upsertError) throw new Error(upsertError.message)
            updatedCount += 1
          } else {
            const ensured = await ensureAuthUser(admin, {
              email,
              reg_number: regNumber,
              full_name: fullName,
              phone: raw.phone,
            })

            const { error: upsertError } = await admin.from('students').upsert(
              {
                id: ensured.userId,
                reg_number: regNumber,
                ...studentFields,
              },
              { onConflict: 'reg_number' },
            )

            if (upsertError) {
              if (upsertError.code === '23505' || upsertError.message.toLowerCase().includes('duplicate')) {
                const { error: updateError } = await admin
                  .from('students')
                  .update(studentFields)
                  .eq('reg_number', regNumber)
                if (updateError) throw new Error(updateError.message)
                updatedCount += 1
              } else {
                throw new Error(upsertError.message)
              }
            } else {
              importedCount += 1
              if (ensured.created && ensured.password) {
                newAccounts.push({
                  email,
                  reg_number: regNumber,
                  password: ensured.password,
                })
              }
            }
          }
        } catch (err) {
          errors.push({
            email,
            reg_number: regNumber,
            message: err instanceof Error ? err.message : 'Import failed',
          })
        }
      }

      // Soft pause between batches to ease Auth rate limits
      if (i + BATCH_SIZE < students.length) {
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
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
    return jsonResponse({ success: false, error: message }, 500)
  }
})
