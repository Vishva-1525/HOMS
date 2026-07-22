/**
 * Parse a CSV with email + password columns into scripts/users.json.
 *
 * Usage:
 *   node scripts/csv-to-users-json.mjs [input.csv]
 *
 * Default input: ./students.csv (project root)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Papa from 'papaparse'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const defaultInput = resolve(projectRoot, 'students.csv')
const outputPath = resolve(__dirname, 'users.json')

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function pickField(row, ...keys) {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

const inputPath = resolve(projectRoot, process.argv[2] ?? 'students.csv')

if (!existsSync(inputPath)) {
  console.error(`Input CSV not found: ${inputPath}`)
  process.exit(1)
}

const csvText = readFileSync(inputPath, 'utf8')
const parsed = Papa.parse(csvText, {
  header: true,
  skipEmptyLines: true,
  transformHeader: normalizeHeader,
})

if (parsed.errors.length > 0) {
  console.error('CSV parse errors:')
  for (const err of parsed.errors.slice(0, 10)) {
    console.error(`  row ${err.row}: ${err.message}`)
  }
  process.exit(1)
}

const users = []
const skipped = []

for (let i = 0; i < parsed.data.length; i++) {
  const row = parsed.data[i]
  const email = pickField(row, 'email', 'e_mail', 'student_email')
  const password = pickField(row, 'password', 'pass', 'pwd')

  if (!email || !password) {
    skipped.push({ row: i + 2, email: email || '(blank)', reason: 'missing email or password' })
    continue
  }

  users.push({ email, password })
}

writeFileSync(outputPath, `${JSON.stringify(users, null, 2)}\n`, 'utf8')

console.log(`Read:   ${inputPath}`)
console.log(`Wrote:  ${outputPath}`)
console.log(`Users:  ${users.length}`)
if (skipped.length > 0) {
  console.log(`Skipped: ${skipped.length}`)
  for (const s of skipped.slice(0, 5)) {
    console.log(`  line ${s.row}: ${s.reason} (${s.email})`)
  }
  if (skipped.length > 5) {
    console.log(`  ... and ${skipped.length - 5} more`)
  }
}
