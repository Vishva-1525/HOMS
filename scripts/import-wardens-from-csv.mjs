/**
 * Create warden accounts from data/wardens.csv
 *
 * Usage:
 *   node scripts/import-wardens-from-csv.mjs [path/to/wardens.csv]
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const DEFAULT_CSV = resolve(projectRoot, 'data/wardens.csv')

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

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cells = line.split(',')
    const record = {}
    headers.forEach((header, idx) => {
      record[header] = (cells[idx] ?? '').trim()
    })
    rows.push(record)
  }
  return rows
}

function normalizeHostelBlock(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return ''
  const upper = raw.toUpperCase()
  const roman = { I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8', IX: '9' }
  let match = upper.match(/^BLOCK\s+([IVX]+)$/)
  if (match && roman[match[1]]) return `BLOCK ${roman[match[1]]}`
  match = upper.match(/^BLOCK\s+(\d+)$/)
  if (match) return `BLOCK ${Number(match[1])}`
  if (roman[upper]) return `BLOCK ${roman[upper]}`
  if (/^\d+$/.test(upper)) return `BLOCK ${Number(upper)}`
  return upper
}

function normalizeGender(value) {
  const g = String(value ?? '').trim().toLowerCase()
  if (['male', 'm', 'boy', 'boys'].includes(g)) return 'male'
  if (['female', 'f', 'girl', 'girls'].includes(g)) return 'female'
  return null
}

function passwordFromFullName(fullName) {
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

function generatePassword(fullName) {
  return passwordFromFullName(fullName)
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

  const csvPath = resolve(process.argv[2] ?? DEFAULT_CSV)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = await fetchServiceRoleKey()

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  if (!existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`)
    process.exit(1)
  }

  const rawRows = parseCsv(readFileSync(csvPath, 'utf8'))
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let created = 0
  let updated = 0
  let failed = 0
  const credentials = []

  for (const raw of rawRows) {
    const full_name = String(raw.full_name ?? '').trim()
    const email = String(raw.email ?? '').trim().toLowerCase()
    const phone = String(raw.phone ?? '').trim()
    const block = normalizeHostelBlock(raw.block ?? raw.hostel_block ?? '')
    const gender = normalizeGender(raw.gender)

    if (!full_name || !email || !block || !gender) {
      failed += 1
      console.error(`SKIP invalid row: ${email || full_name || 'unknown'}`)
      continue
    }

    try {
      let userId = await findUserIdByEmail(admin, email)
      let password

      if (userId) {
        password = generatePassword(full_name)
        const { error: authError } = await admin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { role: 'warden', full_name, phone, gender },
        })
        if (authError) throw new Error(authError.message)
        updated += 1
      } else {
        password = generatePassword(full_name)
        const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: 'warden', full_name, phone, gender },
        })
        if (createError || !createdUser.user) {
          throw new Error(createError?.message ?? 'create failed')
        }
        userId = createdUser.user.id
        created += 1
      }

      const { error: profileError } = await admin.from('profiles').upsert({
        id: userId,
        role: 'warden',
        full_name,
        phone,
        gender,
        password_changed: true,
      })
      if (profileError) throw new Error(profileError.message)

      const { error: assignmentError } = await admin.from('staff_assignments').upsert(
        {
          profile_id: userId,
          assignment_type: 'block',
          assignment_value: block,
        },
        { onConflict: 'profile_id,assignment_type' },
      )
      if (assignmentError) throw new Error(assignmentError.message)

      credentials.push({ email, password, block, gender, full_name })
      console.log(`OK ${gender} ${block}: ${email}`)
    } catch (err) {
      failed += 1
      console.error(`FAIL ${email}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log('\n--- Warden import summary ---')
  console.log(`Created: ${created}`)
  console.log(`Updated: ${updated}`)
  console.log(`Failed:  ${failed}`)
  console.log('\nCredentials (share securely):')
  for (const c of credentials) {
    console.log(`${c.full_name} | ${c.email} | ${c.password} | ${c.gender} ${c.block}`)
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
