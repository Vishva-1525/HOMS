/**
 * Bulk-create Supabase Auth users from a local JSON file.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bulk-import-auth-users.mjs
 *   node scripts/bulk-import-auth-users.mjs path/to/users.json
 *
 * users.json format:
 *   [
 *     { "email": "student@svce.ac.in", "password": "2127251001030" },
 *     { "email": "other@svce.ac.in", "password": "secret123", "full_name": "Optional Name" }
 *   ]
 *
 * Loads SUPABASE_URL / VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
 * environment. If a .env file exists in the project root, missing vars are read from there.
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

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

function requireEnv(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined)
  if (!value?.trim()) {
    console.error(
      `Missing ${name}${fallbackName ? ` (or ${fallbackName})` : ''}. Set it in the environment or .env.`,
    )
    process.exit(1)
  }
  return value.trim()
}

function parseUsersFile(filePath) {
  if (!existsSync(filePath)) {
    console.error(`users file not found: ${filePath}`)
    console.error('Create scripts/users.json or pass a path: node scripts/bulk-import-auth-users.mjs ./users.json')
    process.exit(1)
  }

  let parsed
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error(`Failed to parse JSON: ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }

  if (!Array.isArray(parsed)) {
    console.error('users.json must be a JSON array of { email, password } objects.')
    process.exit(1)
  }

  return parsed
}

function normalizeUser(row, index) {
  const email = String(row?.email ?? '').trim().toLowerCase()
  const password = String(row?.password ?? '').trim()

  if (!email || !password) {
    return {
      ok: false,
      index,
      email: email || undefined,
      error: 'Each row must include non-empty email and password.',
    }
  }

  if (!email.includes('@')) {
    return { ok: false, index, email, error: 'Invalid email address.' }
  }

  const user_metadata = {}
  if (row.full_name) user_metadata.full_name = String(row.full_name).trim()
  if (row.role) user_metadata.role = String(row.role).trim()
  if (row.phone) user_metadata.phone = String(row.phone).trim()

  return {
    ok: true,
    index,
    email,
    password,
    user_metadata: Object.keys(user_metadata).length > 0 ? user_metadata : undefined,
  }
}

async function main() {
  loadDotEnv()

  const supabaseUrl = requireEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const usersPath = resolve(process.argv[2] ?? resolve(__dirname, 'users.json'))
  const rawUsers = parseUsersFile(usersPath)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`Bulk import started — ${rawUsers.length} row(s) from ${usersPath}`)
  console.log(`Target: ${supabaseUrl}`)
  console.log('email_confirm: true (no verification emails will be sent)\n')

  let succeeded = 0
  let failed = 0
  const failures = []

  for (let i = 0; i < rawUsers.length; i++) {
    const normalized = normalizeUser(rawUsers[i], i + 1)

    if (!normalized.ok) {
      failed += 1
      failures.push({ index: normalized.index, email: normalized.email, error: normalized.error })
      console.error(`[${normalized.index}/${rawUsers.length}] SKIP — ${normalized.error}`)
      continue
    }

    const { email, password, user_metadata, index } = normalized

    const payload = {
      email,
      password,
      email_confirm: true,
      ...(user_metadata ? { user_metadata } : {}),
    }

    const { data, error } = await admin.auth.admin.createUser(payload)

    if (error) {
      failed += 1
      failures.push({ index, email, error: error.message })
      console.error(`[${index}/${rawUsers.length}] FAIL ${email} — ${error.message}`)
      continue
    }

    succeeded += 1
    const userId = data.user?.id ?? 'unknown'
    console.log(`[${index}/${rawUsers.length}] OK   ${email} (id: ${userId})`)
  }

  console.log('\n--- Import summary ---')
  console.log(`Total:     ${rawUsers.length}`)
  console.log(`Succeeded: ${succeeded}`)
  console.log(`Failed:    ${failed}`)

  if (failures.length > 0) {
    console.log('\nFailed rows:')
    for (const f of failures.slice(0, 25)) {
      console.log(`  #${f.index} ${f.email ?? '(no email)'} — ${f.error}`)
    }
    if (failures.length > 25) {
      console.log(`  ... and ${failures.length - 25} more`)
    }
    process.exit(1)
  }

  console.log('\nAll users imported successfully.')
}

main().catch((err) => {
  console.error('Unexpected error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
