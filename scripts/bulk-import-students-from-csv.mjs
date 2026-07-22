/**
 * Bulk-update student records from a HOMS-compatible CSV via Supabase service role.
 * Use after Auth users exist (append-style import — updates by reg_number).
 *
 * Usage:
 *   node scripts/bulk-import-students-from-csv.mjs [path/to/students.csv]
 *
 * Default CSV: "Untitled spreadsheet - Sheet1.csv" in project root.
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const DEFAULT_CSV = resolve(projectRoot, 'data/students-final.csv')
const CHUNK_SIZE = 25

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

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cells = splitCsvLine(line)
    const record = {}
    headers.forEach((header, idx) => {
      record[header] = (cells[idx] ?? '').trim()
    })
    rows.push(record)
  }

  return rows
}

function splitCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current)
  return cells
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

function normalizeYear(value) {
  const n = Number(String(value ?? '').trim())
  if (!Number.isFinite(n) || n < 1 || n > 4) return null
  return Math.trunc(n)
}

function mapRow(raw, index) {
  const email = (raw.email ?? '').trim().toLowerCase()
  const reg_number = (raw.reg_number ?? '').trim()
  const full_name = (raw.full_name ?? '').trim()
  const phone = (raw.phone ?? raw.parent_phone ?? '').trim()
  const room_number = (raw.room_number ?? raw.room ?? '').trim()
  const hostel_block = normalizeHostelBlock(raw.hostel_block ?? raw.block ?? '')
  const department = (raw.department ?? '').trim()
  const year_of_study = normalizeYear(raw.year_of_study ?? raw.year)
  const gender = normalizeGender(raw.gender)

  if (!email || !reg_number || !full_name) {
    return { error: `Row ${index + 2}: missing email, reg_number, or full_name` }
  }
  if (!email.includes('@')) {
    return { error: `Row ${index + 2}: invalid email “${email}”` }
  }
  if (year_of_study == null) {
    return { error: `Row ${index + 2}: year must be 1–4 (got “${raw.year_of_study ?? raw.year ?? ''}”)` }
  }
  if (!gender) {
    return { error: `Row ${index + 2}: gender must be male or female` }
  }

  return {
    row: {
      email,
      reg_number,
      full_name,
      phone,
      room_number,
      hostel_block,
      department,
      year_of_study,
      gender,
    },
  }
}

function chunkArray(items, size) {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function importRow(admin, row) {
  const { data: existing, error: lookupError } = await admin
    .from('students')
    .select('id')
    .eq('reg_number', row.reg_number)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`lookup ${row.reg_number}: ${lookupError.message}`)
  }
  if (!existing?.id) {
    throw new Error(`no student row for ${row.reg_number} (${row.email})`)
  }

  const userId = existing.id

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: row.full_name,
      phone: row.phone,
      password_changed: true,
    })
    .eq('id', userId)

  if (profileError) {
    throw new Error(`profile ${row.reg_number}: ${profileError.message}`)
  }

  const { error: studentError } = await admin
    .from('students')
    .update({
      room_number: row.room_number,
      hostel_block: row.hostel_block,
      department: row.department,
      year_of_study: row.year_of_study,
      parent_phone: row.phone,
      gender: row.gender,
      is_active: true,
    })
    .eq('reg_number', row.reg_number)

  if (studentError) {
    throw new Error(`student ${row.reg_number}: ${studentError.message}`)
  }

  const password = row.reg_number.trim()
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    user_metadata: {
      role: 'student',
      full_name: row.full_name,
      phone: row.phone,
    },
  })
  if (authError) {
    throw new Error(`auth ${row.reg_number}: ${authError.message}`)
  }
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
  const rows = []
  const parseFailures = []

  for (let i = 0; i < rawRows.length; i++) {
    const result = mapRow(rawRows[i], i)
    if (result.error) parseFailures.push(result.error)
    else rows.push(result.row)
  }

  if (parseFailures.length > 0) {
    console.error('CSV validation failed:')
    for (const msg of parseFailures.slice(0, 10)) console.error(`  ${msg}`)
    process.exit(1)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const chunks = chunkArray(rows, CHUNK_SIZE)
  let updated = 0
  let failed = 0
  const failures = []

  console.log(`Importing ${rows.length} students from ${csvPath}`)
  console.log(`Batches: ${chunks.length} × ${CHUNK_SIZE}\n`)

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c]
    for (const row of chunk) {
      try {
        await importRow(admin, row)
        updated += 1
      } catch (err) {
        failed += 1
        const message = err instanceof Error ? err.message : String(err)
        failures.push({ reg_number: row.reg_number, email: row.email, message })
        console.error(`FAIL ${row.reg_number}: ${message}`)
      }
    }
    console.log(`[batch ${c + 1}/${chunks.length}] updated ${updated}, failed ${failed}`)
  }

  console.log('\n--- Import summary ---')
  console.log(`Updated: ${updated}`)
  console.log(`Failed:  ${failed}`)
  if (failures.length > 0) {
    for (const f of failures.slice(0, 15)) {
      console.log(`  ${f.reg_number} (${f.email}): ${f.message}`)
    }
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
