import Papa from 'papaparse'

export type StudentImportMode = 'append' | 'replace'

export interface ParsedStudentImportRow {
  email: string
  reg_number: string
  full_name: string
  phone: string
  room_number: string
  hostel_block: string
  department: string
  year_of_study: number
}

export interface BulkImportResult {
  success: boolean
  importMode?: StudentImportMode
  importedCount?: number
  updatedCount?: number
  errorCount?: number
  errors?: Array<{ reg_number?: string; email?: string; message: string }>
  newAccounts?: Array<{ email: string; reg_number: string; password: string }>
  error?: string
}

const REQUIRED_HEADERS = [
  'email',
  'reg_number',
  'full_name',
  'phone',
  'room',
  'block',
  'department',
  'year',
] as const

/** Map flexible CSV headers → canonical field names. */
const HEADER_ALIASES: Record<string, keyof ParsedStudentImportRow | 'room' | 'block' | 'year'> = {
  email: 'email',
  'e-mail': 'email',
  'student email': 'email',
  'reg number': 'reg_number',
  'reg_number': 'reg_number',
  regnumber: 'reg_number',
  'register number': 'reg_number',
  'registration number': 'reg_number',
  'full name': 'full_name',
  'full_name': 'full_name',
  name: 'full_name',
  phone: 'phone',
  mobile: 'phone',
  'phone number': 'phone',
  room: 'room',
  'room number': 'room',
  'room_number': 'room',
  block: 'block',
  'hostel block': 'block',
  'hostel_block': 'block',
  department: 'department',
  dept: 'department',
  year: 'year',
  'year of study': 'year',
  'year_of_study': 'year',
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

export function getCsvTemplate(): string {
  return [
    'Email,Reg Number,Full Name,Phone,Room,Block,Department,Year',
    '21272101@svce.ac.in,21272101,Ada Lovelace,9876543210,A-101,A Block,CSE,2',
  ].join('\n')
}

export function parseStudentCsv(file: File): Promise<{
  rows: ParsedStudentImportRow[]
  errors: string[]
}> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => normalizeHeader(header),
      complete: (result) => {
        const errors: string[] = []

        if (result.errors.length > 0) {
          for (const err of result.errors.slice(0, 5)) {
            errors.push(`Row ${err.row ?? '?'}: ${err.message}`)
          }
        }

        const rawHeaders = result.meta.fields ?? []
        const mapped = new Map<string, string>()
        for (const h of rawHeaders) {
          const alias = HEADER_ALIASES[h] ?? HEADER_ALIASES[normalizeHeader(h)]
          if (alias) mapped.set(alias, h)
        }

        const missing = REQUIRED_HEADERS.filter((key) => !mapped.has(key))
        if (missing.length > 0) {
          errors.push(
            `Missing required columns: ${missing.join(', ')}. Expected: Email, Reg Number, Full Name, Phone, Room, Block, Department, Year.`,
          )
          resolve({ rows: [], errors })
          return
        }

        const rows: ParsedStudentImportRow[] = []
        result.data.forEach((raw, index) => {
          const get = (key: string) => {
            const header = mapped.get(key)
            return header ? String(raw[header] ?? '').trim() : ''
          }

          const email = get('email')
          const reg_number = get('reg_number')
          const full_name = get('full_name')
          const phone = get('phone')
          const room_number = get('room')
          const hostel_block = get('block')
          const department = get('department')
          const yearRaw = get('year')
          const year_of_study = Number(yearRaw)

          if (!email && !reg_number && !full_name) return

          if (!email || !reg_number || !full_name) {
            errors.push(`Row ${index + 2}: Email, Reg Number, and Full Name are required.`)
            return
          }

          if (!email.includes('@')) {
            errors.push(`Row ${index + 2}: Invalid email “${email}”.`)
            return
          }

          if (!Number.isFinite(year_of_study) || year_of_study < 1 || year_of_study > 4) {
            errors.push(`Row ${index + 2}: Year must be 1–4 (got “${yearRaw || 'empty'}”).`)
            return
          }

          rows.push({
            email: email.toLowerCase(),
            reg_number,
            full_name,
            phone,
            room_number,
            hostel_block,
            department,
            year_of_study: Math.trunc(year_of_study),
          })
        })

        if (rows.length === 0 && errors.length === 0) {
          errors.push('CSV contained no student rows.')
        }

        resolve({ rows, errors })
      },
      error: (err) => {
        resolve({ rows: [], errors: [err.message || 'Failed to parse CSV'] })
      },
    })
  })
}
