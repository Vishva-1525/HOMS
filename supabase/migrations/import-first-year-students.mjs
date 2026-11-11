/**
 * Import first-year (and related) hostel students from
 * data/first-year-students-import.json into Auth + profiles + students.
 *
 * Not a SQL migration — kept under supabase/migrations for ops discoverability.
 * Supabase CLI only applies *.sql files, so this will not run on db push.
 *
 * Login email  = college Email ID ({reg}@svce.ac.in)
 * Password     = register / admission number (exact case as stored)
 *
 * Usage:
 *   node supabase/migrations/import-first-year-students.mjs
 *   node supabase/migrations/import-first-year-students.mjs --dry-run
 *   node supabase/migrations/import-first-year-students.mjs --limit=20
 *   LOGIN_SMOKE_COUNT=25 node supabase/migrations/import-first-year-students.mjs
 *
 * Env:
 *   VITE_SUPABASE_URL / SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY (for login smoke tests)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   — or —
 *   SUPABASE_ACCESS_TOKEN (Management API; used to fetch service_role)
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../..')
const PROJECT_REF = 'xdhemtjljklzmynocout'
const DEFAULT_JSON = resolve(projectRoot, 'data/first-year-students-import.json')
const REPORT_PATH = resolve(projectRoot, 'data/first-year-import-report.json')

function loadDotEnv() {
  for (const name of ['.env', '.env.local']) {
    const envPath = resolve(projectRoot, name)
    if (!existsSync(envPath)) continue
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
    // fall through to pagination
  }

  let page = 1
  while (page <= 40) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) break
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized)
    if (match) return match.id
    if (data.users.length < 200) break
    page += 1
  }
  return null
}

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    limit: null,
    jsonPath: DEFAULT_JSON,
    smoke: Number(process.env.LOGIN_SMOKE_COUNT || 25),
  }
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice('--limit='.length))
    else if (arg.startsWith('--smoke=')) opts.smoke = Number(arg.slice('--smoke='.length))
    else if (!arg.startsWith('-')) opts.jsonPath = resolve(arg)
  }
  return opts
}

async function upsertStudent(admin, userId, row) {
  const studentPayload = {
    id: userId,
    reg_number: row.reg_number,
    room_number: row.room_number || '',
    hostel_block: row.hostel_block || '',
    department: row.department || '',
    year_of_study: Number(row.year_of_study) || 1,
    gender: row.gender === 'female' ? 'female' : 'male',
    parent_phone: row.parent_phone || '',
    parent_email: row.parent_email || '',
    is_active: true,
  }

  const { data: byReg } = await admin
    .from('students')
    .select('id, reg_number')
    .eq('reg_number', row.reg_number)
    .maybeSingle()

  if (byReg && byReg.id !== userId) {
    throw new Error(
      `Register ${row.reg_number} already linked to a different auth user (${byReg.id})`,
    )
  }

  const { data: byId } = await admin.from('students').select('id').eq('id', userId).maybeSingle()
  if (byId) {
    const { error } = await admin.from('students').update(studentPayload).eq('id', userId)
    if (error) throw new Error(`student update failed: ${error.message}`)
    return 'updated'
  }

  const { error } = await admin.from('students').insert(studentPayload)
  if (error) throw new Error(`student insert failed: ${error.message}`)
  return 'inserted'
}

async function provisionOne(admin, row) {
  const email = String(row.email).trim().toLowerCase()
  const password = String(row.password || row.reg_number).trim()
  const regNumber = String(row.reg_number).trim().toUpperCase()
  const fullName = String(row.full_name || '').trim()

  let userId = await findUserIdByEmail(admin, email)
  let authAction = 'updated'

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'student' },
      user_metadata: {
        role: 'student',
        full_name: fullName,
        phone: '',
      },
    })
    if (error) throw new Error(`createUser failed: ${error.message}`)
    userId = data.user.id
    authAction = 'created'
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      app_metadata: { role: 'student' },
      user_metadata: {
        role: 'student',
        full_name: fullName,
        phone: '',
      },
    })
    if (error) throw new Error(`updateUser failed: ${error.message}`)
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    role: 'student',
    full_name: fullName,
    phone: '',
    gender: row.gender === 'female' ? 'female' : 'male',
    password_changed: false,
  })
  if (profileError) throw new Error(`profile upsert failed: ${profileError.message}`)

  const studentAction = await upsertStudent(admin, userId, {
    ...row,
    reg_number: regNumber,
  })

  return { email, reg_number: regNumber, userId, authAction, studentAction }
}

async function smokeLogin(anon, email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error) {
    if (password !== password.toUpperCase()) {
      const retry = await anon.auth.signInWithPassword({
        email,
        password: password.toUpperCase(),
      })
      if (!retry.error) {
        await anon.auth.signOut()
        return { ok: true, userId: retry.data.user?.id }
      }
      return { ok: false, error: retry.error.message }
    }
    return { ok: false, error: error.message }
  }
  await anon.auth.signOut()
  return { ok: true, userId: data.user?.id }
}

async function main() {
  loadDotEnv()
  const opts = parseArgs(process.argv.slice(2))

  if (!existsSync(opts.jsonPath)) {
    console.error(`Missing import file: ${opts.jsonPath}`)
    process.exit(1)
  }

  const rows = JSON.parse(readFileSync(opts.jsonPath, 'utf8'))
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('Import file must be a non-empty JSON array')
    process.exit(1)
  }

  const selected = opts.limit ? rows.slice(0, opts.limit) : rows
  console.log(`Students to process: ${selected.length} (of ${rows.length})`)
  console.log(`Source: ${opts.jsonPath}`)
  if (opts.dryRun) {
    console.log('DRY RUN — no writes')
    console.log(selected.slice(0, 3))
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = await fetchServiceRoleKey()
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase URL or service role access.')
    console.error('Set SUPABASE_SERVICE_ROLE_KEY, or a valid SUPABASE_ACCESS_TOKEN for this project.')
    process.exit(1)
  }
  if (!anonKey) {
    console.error('Missing VITE_SUPABASE_ANON_KEY (needed for login smoke tests).')
    process.exit(1)
  }
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const results = []
  const failures = []
  let created = 0
  let updated = 0

  for (let i = 0; i < selected.length; i++) {
    const row = selected[i]
    const label = `[${i + 1}/${selected.length}] ${row.reg_number} <${row.email}>`
    try {
      const result = await provisionOne(admin, row)
      results.push(result)
      if (result.authAction === 'created') created += 1
      else updated += 1
      console.log(`${label} — auth:${result.authAction} student:${result.studentAction}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      failures.push({ email: row.email, reg_number: row.reg_number, error: message })
      console.error(`${label} — FAIL ${message}`)
    }
  }

  const smokeTargets = []
  for (const r of results) {
    if (smokeTargets.length >= opts.smoke) break
    smokeTargets.push(r)
  }
  if (results.length > 0 && !smokeTargets.find((r) => r.email === results[results.length - 1].email)) {
    smokeTargets.push(results[results.length - 1])
  }

  const loginResults = []
  console.log(`\nLogin smoke tests: ${smokeTargets.length}`)
  for (const target of smokeTargets) {
    const password = selected.find((r) => r.email === target.email)?.password || target.reg_number
    const login = await smokeLogin(anon, target.email, password)
    loginResults.push({ email: target.email, reg_number: target.reg_number, ...login })
    console.log(
      login.ok
        ? `  OK  ${target.reg_number} / ${target.email}`
        : `  FAIL ${target.reg_number} / ${target.email} — ${login.error}`,
    )
  }

  const rpcSmoke = smokeTargets.slice(0, Math.min(5, smokeTargets.length))
  console.log(`\nRegister-number → email RPC smoke: ${rpcSmoke.length}`)
  for (const target of rpcSmoke) {
    const { data, error } = await anon.rpc('get_student_login_email', {
      reg_number_input: target.reg_number,
    })
    const ok = !error && String(data || '').toLowerCase() === target.email.toLowerCase()
    console.log(
      ok
        ? `  OK  ${target.reg_number} → ${data}`
        : `  FAIL ${target.reg_number} — ${error?.message || data}`,
    )
    loginResults.push({
      type: 'reg_rpc',
      reg_number: target.reg_number,
      ok,
      email: data,
      error: error?.message,
    })
  }

  const report = {
    at: new Date().toISOString(),
    total_in_file: rows.length,
    processed: selected.length,
    created,
    updated,
    failed: failures.length,
    login_smoke_ok: loginResults.filter((r) => r.ok && !r.type).length,
    login_smoke_fail: loginResults.filter((r) => !r.ok && !r.type).length,
    failures,
    loginResults,
  }
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))

  console.log('\n--- Summary ---')
  console.log(`Processed: ${selected.length}`)
  console.log(`Created:   ${created}`)
  console.log(`Updated:   ${updated}`)
  console.log(`Failed:    ${failures.length}`)
  console.log(`Login OK:  ${report.login_smoke_ok}`)
  console.log(`Login FAIL:${report.login_smoke_fail}`)
  console.log(`Report:    ${REPORT_PATH}`)

  if (failures.length > 0 || report.login_smoke_fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
