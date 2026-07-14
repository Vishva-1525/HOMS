import Papa from 'papaparse'
import * as XLSX from 'xlsx'

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

export interface StudentImportParseResult {
  rows: ParsedStudentImportRow[]
  errors: string[]
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

/** Map flexible spreadsheet headers → canonical field names. */
const HEADER_ALIASES: Record<string, keyof ParsedStudentImportRow | 'room' | 'block' | 'year'> = {
  email: 'email',
  'e-mail': 'email',
  'student email': 'email',
  'reg number': 'reg_number',
  reg_number: 'reg_number',
  regnumber: 'reg_number',
  'register number': 'reg_number',
  'registration number': 'reg_number',
  'full name': 'full_name',
  full_name: 'full_name',
  name: 'full_name',
  phone: 'phone',
  mobile: 'phone',
  'phone number': 'phone',
  room: 'room',
  'room number': 'room',
  room_number: 'room',
  block: 'block',
  'hostel block': 'block',
  hostel_block: 'block',
  department: 'department',
  dept: 'department',
  year: 'year',
  'year of study': 'year',
  year_of_study: 'year',
}

const TEMPLATE_HEADERS = [
  'Email',
  'Reg Number',
  'Full Name',
  'Phone',
  'Room',
  'Block',
  'Department',
  'Year',
] as const

const TEMPLATE_SAMPLE_ROW = [
  '21272101@svce.ac.in',
  '21272101',
  'Ada Lovelace',
  '9876543210',
  'A-101',
  'A Block',
  'CSE',
  '2',
] as const

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

function cellToString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Avoid scientific notation / trailing .0 from Excel numerics where possible
    return Number.isInteger(value) ? String(value) : String(value).trim()
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value instanceof Date) return value.toISOString()
  return String(value).trim()
}

function mapRecordsToStudents(
  records: Record<string, string>[],
  rawHeaders: string[],
): StudentImportParseResult {
  const errors: string[] = []
  const mapped = new Map<string, string>()

  for (const h of rawHeaders) {
    const normalized = normalizeHeader(h)
    const alias = HEADER_ALIASES[normalized] ?? HEADER_ALIASES[h]
    if (alias) mapped.set(alias, h)
  }

  const missing = REQUIRED_HEADERS.filter((key) => !mapped.has(key))
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        `Missing required columns: ${missing.join(', ')}. Expected: Email, Reg Number, Full Name, Phone, Room, Block, Department, Year.`,
      ],
    }
  }

  const rows: ParsedStudentImportRow[] = []
  records.forEach((raw, index) => {
    const get = (key: string) => {
      const header = mapped.get(key)
      return header ? cellToString(raw[header]) : ''
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
    errors.push('File contained no student rows.')
  }

  return { rows, errors }
}

export function getCsvTemplate(): string {
  return [TEMPLATE_HEADERS.join(','), TEMPLATE_SAMPLE_ROW.join(',')].join('\n')
}

export function getXlsxTemplateBlob(): Blob {
  const sheet = XLSX.utils.aoa_to_sheet([
    [...TEMPLATE_HEADERS],
    [...TEMPLATE_SAMPLE_ROW],
  ])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Students')
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function parseStudentCsv(file: File): Promise<StudentImportParseResult> {
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
        const mapped = mapRecordsToStudents(
          result.data.map((row) => {
            const next: Record<string, string> = {}
            for (const [key, value] of Object.entries(row)) {
              next[key] = cellToString(value)
            }
            return next
          }),
          rawHeaders,
        )

        resolve({
          rows: mapped.rows,
          errors: [...errors, ...mapped.errors],
        })
      },
      error: (err) => {
        resolve({ rows: [], errors: [err.message || 'Failed to parse CSV'] })
      },
    })
  })
}

export async function parseStudentXlsx(file: File): Promise<StudentImportParseResult> {
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return { rows: [], errors: ['Excel file has no sheets.'] }
    }

    const sheet = workbook.Sheets[sheetName]
    const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    }) as unknown as unknown[][]

    if (!matrix.length) {
      return { rows: [], errors: ['Excel sheet is empty.'] }
    }

    const headerRow = (matrix[0] ?? []).map((cell) => normalizeHeader(cellToString(cell)))
    if (headerRow.every((h) => !h)) {
      return { rows: [], errors: ['Excel sheet is missing a header row.'] }
    }

    const records: Record<string, string>[] = []
    for (const row of matrix.slice(1)) {
      const record: Record<string, string> = {}
      let hasAny = false
      headerRow.forEach((header, index) => {
        if (!header) return
        const value = cellToString(row?.[index])
        record[header] = value
        if (value) hasAny = true
      })
      if (hasAny) records.push(record)
    }

    return mapRecordsToStudents(records, headerRow.filter(Boolean))
  } catch (err) {
    return {
      rows: [],
      errors: [err instanceof Error ? err.message : 'Failed to parse Excel file'],
    }
  }
}

function getImportExtension(fileName: string): 'csv' | 'xlsx' | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.xlsx')) return 'xlsx'
  return null
}

/** Parse a student import file (.csv or .xlsx). */
export async function parseStudentImportFile(file: File): Promise<StudentImportParseResult> {
  const ext = getImportExtension(file.name)
  if (ext === 'csv') return parseStudentCsv(file)
  if (ext === 'xlsx') return parseStudentXlsx(file)
  return {
    rows: [],
    errors: ['Please upload a .csv or .xlsx file.'],
  }
}
