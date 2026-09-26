/**
 * Provision a single HOMS student (Auth + profiles + students).
 *
 * Usage:
 *   node scripts/add-one-student.mjs
 *
 * Env (from .env or shell):
 *   VITE_SUPABASE_URL / SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   — or —
 *   SUPABASE_ACCESS_TOKEN  (Management API; used to fetch service_role)
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const PROJECT_REF = 'xdhemtjljklzmynocout'

const STUDENT = {
  email: '2024ec0992@svce.ac.in',
  reg_number: '2024EC0992',
  full_name: 'Sri Ramana Kishore K',
  phone: '9894455166',
  room_number: '3004',
  hostel_block: 'BLOCK 3',
  department: 'ECE',
  year_of_study: 3,
  gender: 'male',
}

function loadDotEnv() {
  const envPath = resolve(projectRoot, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env) || process.env[key] === '') {
      process.env[key] = value
    }
  }
}

async function fetchServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
  }
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
  if (!token) return null
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to fetch API keys (${res.status}): ${body}`)
  }
  const keys = await res.json()
  return keys.find((k) => k.name === 'service_role')?.api_key ?? null
}

async function findUserIdByEmail(admin, email) {
  const normalized = email.trim().toLowerCase()
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
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
      const payload = await res.json()
      if (Array.isArray(payload.users)) {
        const match = payload.users.find((u) => u.email?.toLowerCase() === normalized)
        if (match) return match.id
      } else if (payload.id) {
        return payload.id
      }
    }
  } catch {
    // fall through
  }

  let page = 1
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) break
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized)
    if (match) return match.id
    if (data.users.length < 200) break
    page += 1
  }
  return null
}

async function main() {
  loadDotEnv()

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = await fetchServiceRoleKey()
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or service role access.')
    console.error('Set SUPABASE_SERVICE_ROLE_KEY or a valid SUPABASE_ACCESS_TOKEN for the HOMS project.')
    process.exit(1)
  }
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const email = STUDENT.email.trim().toLowerCase()
  const password = STUDENT.reg_number.trim()
  const regNumber = STUDENT.reg_number.trim().toUpperCase()

  let userId = await findUserIdByEmail(admin, email)
  let created = false

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        full_name: STUDENT.full_name,
        phone: '',
      },
    })
    if (error) throw new Error(`createUser failed: ${error.message}`)
    userId = data.user.id
    created = true
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        full_name: STUDENT.full_name,
        phone: '',
      },
    })
    if (error) throw new Error(`updateUser failed: ${error.message}`)
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    role: 'student',
    full_name: STUDENT.full_name,
    phone: '',
    password_changed: true,
  })
  if (profileError) throw new Error(`profile upsert failed: ${profileError.message}`)

  const studentPayload = {
    id: userId,
    reg_number: regNumber,
    room_number: STUDENT.room_number,
    hostel_block: STUDENT.hostel_block,
    department: STUDENT.department,
    year_of_study: STUDENT.year_of_study,
    gender: STUDENT.gender,
    parent_phone: STUDENT.phone,
    parent_email: '',
    is_active: true,
  }

  const { data: existingByReg } = await admin
    .from('students')
    .select('id, reg_number')
    .eq('reg_number', regNumber)
    .maybeSingle()

  if (existingByReg && existingByReg.id !== userId) {
    throw new Error(
      `Register ${regNumber} already linked to a different auth user (${existingByReg.id})`,
    )
  }

  const { data: existingById } = await admin
    .from('students')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (existingById) {
    const { error } = await admin.from('students').update(studentPayload).eq('id', userId)
    if (error) throw new Error(`student update failed: ${error.message}`)
  } else {
    const { error } = await admin.from('students').insert(studentPayload)
    if (error) throw new Error(`student insert failed: ${error.message}`)
  }

  const { data: verify, error: verifyError } = await admin
    .from('students')
    .select('id, reg_number, room_number, hostel_block, department, year_of_study, gender, parent_phone, is_active, profiles(full_name, role, password_changed)')
    .eq('id', userId)
    .single()

  if (verifyError) throw new Error(`verify failed: ${verifyError.message}`)

  // Confirm login works with the provisioned password.
  const anon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError) throw new Error(`login smoke test failed: ${signInError.message}`)
  await anon.auth.signOut()

  console.log(JSON.stringify({
    ok: true,
    created,
    login: {
      email,
      password,
      identifier_alternatives: [regNumber, email],
    },
    student: verify,
    auth_user_id: userId,
    signed_in_user_id: signIn.user?.id,
  }, null, 2))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
