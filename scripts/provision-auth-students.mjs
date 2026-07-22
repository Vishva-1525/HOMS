/**
 * Provision HOMS student records for Auth-only imports.
 * Reads scripts/users.json and for each user:
 * - Ensures profiles.role = student, password_changed = true
 * - Upserts public.students with reg_number from password field
 * - Syncs Auth password to the CSV password value
 *
 * Usage:
 *   node scripts/provision-auth-students.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const usersPath = resolve(__dirname, 'users.json')

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
    'https://api.supabase.com/v1/projects/xdhemtjljklzmynocout/api-keys',
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) return null
  const keys = await res.json()
  return keys.find((k) => k.name === 'service_role')?.api_key ?? null
}

async function findUserIdByEmail(admin, email) {
  const normalized = email.trim().toLowerCase()
  let page = 1
  while (page <= 30) {
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
    console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  if (!existsSync(usersPath)) {
    console.error(`Missing ${usersPath} — run csv-to-users-json first.`)
    process.exit(1)
  }

  const users = JSON.parse(readFileSync(usersPath, 'utf8'))
  if (!Array.isArray(users)) {
    console.error('users.json must be an array')
    process.exit(1)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let provisioned = 0
  let failed = 0
  const failures = []

  console.log(`Provisioning ${users.length} students...\n`)

  for (let i = 0; i < users.length; i++) {
    const email = String(users[i]?.email ?? '').trim().toLowerCase()
    const password = String(users[i]?.password ?? '').trim()
    const regNumber = password.toUpperCase()

    if (!email || !regNumber) {
      failed += 1
      failures.push({ email, error: 'missing email or password/reg_number' })
      continue
    }

    try {
      const userId = await findUserIdByEmail(admin, email)
      if (!userId) {
        throw new Error('Auth user not found')
      }

      const { error: authError } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          role: 'student',
          full_name: regNumber,
        },
      })
      if (authError) throw new Error(`auth: ${authError.message}`)

      const { error: profileError } = await admin.from('profiles').upsert({
        id: userId,
        role: 'student',
        full_name: regNumber,
        phone: '',
        password_changed: true,
      })
      if (profileError) throw new Error(`profile: ${profileError.message}`)

      const { error: studentError } = await admin.from('students').upsert(
        {
          id: userId,
          reg_number: regNumber,
          room_number: '',
          hostel_block: '',
          department: '',
          year_of_study: 1,
          parent_phone: '',
          parent_email: '',
          is_active: true,
        },
        { onConflict: 'id' },
      )
      if (studentError) throw new Error(`student: ${studentError.message}`)

      provisioned += 1
      if ((i + 1) % 50 === 0 || i === users.length - 1) {
        console.log(`[${i + 1}/${users.length}] provisioned ${provisioned}`)
      }
    } catch (err) {
      failed += 1
      failures.push({
        email,
        error: err instanceof Error ? err.message : String(err),
      })
      console.error(`[${i + 1}/${users.length}] FAIL ${email}`)
    }
  }

  console.log('\n--- Provision summary ---')
  console.log(`Provisioned: ${provisioned}`)
  console.log(`Failed:      ${failed}`)
  if (failures.length > 0) {
    for (const f of failures.slice(0, 10)) {
      console.log(`  ${f.email}: ${f.error}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
