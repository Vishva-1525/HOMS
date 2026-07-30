/**
 * Upload student profile photos to Supabase Storage and set profiles.avatar_url.
 *
 * Usage:
 *   node scripts/upload-student-photos.mjs [path/to/mapping.csv|json]
 *
 * Mapping formats:
 *   CSV  columns: email | reg_number (or roll_number), photo_url | image_url | drive_url | path
 *   JSON array of { email?, reg_number?, roll_number?, photo_url? | image_url? | path? }
 *
 * Env:
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ACCESS_TOKEN to fetch it)
 *   PHOTO_CONCURRENCY (default 4)
 *   PHOTO_DRY_RUN=1  — resolve + download only, skip upload/DB update
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const BUCKET = 'student-profiles'
/** Canonical MIME types accepted by the bucket / uploads. */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
/** Non-standard aliases often used for JPG files. */
const MIME_ALIASES = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-jpeg': 'image/jpeg',
}
const DEFAULT_CONCURRENCY = 4
const DEFAULT_MAPPING_CANDIDATES = [
  resolve(projectRoot, 'data/students_detail.csv'),
  resolve(projectRoot, 'data/students_photos.json'),
  resolve(projectRoot, 'students_detail.csv'),
  resolve(projectRoot, 'students_photos.json'),
]

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

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return ''
}

function normalizeMappingRows(rawRows) {
  return rawRows.map((raw, index) => {
    const email = pick(raw, ['email', 'student_email', 'mail']).toLowerCase()
    const reg_number = pick(raw, [
      'reg_number',
      'roll_number',
      'roll_no',
      'regno',
      'register_number',
      'admission_no',
      'admission_number',
    ])
    const source = pick(raw, [
      'photo_url',
      'image_url',
      'drive_url',
      'url',
      'photo',
      'image',
      'path',
      'file_path',
      'local_path',
    ])

    return {
      index: index + 1,
      email,
      reg_number,
      source,
    }
  })
}

function resolveMappingPath(arg) {
  if (arg) {
    const path = isAbsolute(arg) ? arg : resolve(process.cwd(), arg)
    if (!existsSync(path)) {
      throw new Error(`Mapping file not found: ${path}`)
    }
    return path
  }
  for (const candidate of DEFAULT_MAPPING_CANDIDATES) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(
    `No mapping file found. Pass a path, or add one of:\n  ${DEFAULT_MAPPING_CANDIDATES.join('\n  ')}`,
  )
}

function loadMapping(filePath) {
  const text = readFileSync(filePath, 'utf8')
  const ext = extname(filePath).toLowerCase()
  let rawRows
  if (ext === '.json') {
    const parsed = JSON.parse(text)
    rawRows = Array.isArray(parsed) ? parsed : parsed.students ?? parsed.rows ?? []
    if (!Array.isArray(rawRows)) {
      throw new Error('JSON mapping must be an array or { students: [...] }')
    }
  } else {
    rawRows = parseCsv(text)
  }
  return normalizeMappingRows(rawRows).filter((row) => row.email || row.reg_number || row.source)
}

/** Convert common Google Drive share links to a direct download URL. */
function toDirectDownloadUrl(url) {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('drive.google.com') && !u.hostname.includes('docs.google.com')) {
      return url
    }
    let id = u.searchParams.get('id')
    if (!id) {
      const match = u.pathname.match(/\/(?:file|uc)\/d\/([^/]+)/)
      if (match) id = match[1]
    }
    if (!id) return url
    return `https://drive.google.com/uc?export=download&id=${id}`
  } catch {
    return url
  }
}

function normalizeMime(raw) {
  const mime = String(raw ?? '').split(';')[0].trim().toLowerCase()
  if (!mime) return ''
  return MIME_ALIASES[mime] ?? mime
}

function isAllowedMime(mime) {
  return ALLOWED_MIME.includes(normalizeMime(mime))
}

function mimeFromExtension(filePathOrUrl) {
  const ext = extname(String(filePathOrUrl).split('?')[0]).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.jpe') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return ''
}

function sniffContentType(bytes, fallback = 'image/jpeg') {
  // JPEG / JPG magic: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
  ) {
    return 'image/png'
  }
  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return normalizeMime(fallback) || 'image/jpeg'
}

/** Always store JPEG payloads as `.jpg` (not `.jpeg`). */
function extensionForMime(mime) {
  const normalized = normalizeMime(mime)
  if (normalized === 'image/png') return 'png'
  if (normalized === 'image/webp') return 'webp'
  return 'jpg'
}

function resolveContentType(bytes, hintMime, sourcePath) {
  const fromBytes = sniffContentType(bytes, '')
  if (fromBytes && isAllowedMime(fromBytes)) return fromBytes

  const fromHint = normalizeMime(hintMime)
  if (fromHint && isAllowedMime(fromHint)) return fromHint

  const fromExt = mimeFromExtension(sourcePath)
  if (fromExt && isAllowedMime(fromExt)) return fromExt

  // JPG is the default student-photo format for this pipeline.
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'image/jpeg'
  }

  throw new Error(
    `unsupported content type: ${hintMime || fromExt || 'unknown'} (expected jpg/jpeg/png/webp)`,
  )
}

async function readPhotoPayload(source, mappingDir) {
  if (!source) throw new Error('missing photo source')

  const looksLocal =
    !/^https?:\/\//i.test(source)
    && (source.startsWith('.') || source.startsWith('/') || /^[A-Za-z]:[\\/]/.test(source))

  if (looksLocal || existsSync(source) || existsSync(resolve(mappingDir, source))) {
    const localPath = existsSync(source)
      ? source
      : existsSync(resolve(mappingDir, source))
        ? resolve(mappingDir, source)
        : resolve(projectRoot, source)
    if (!existsSync(localPath)) {
      throw new Error(`local file not found: ${localPath}`)
    }
    const buffer = readFileSync(localPath)
    const bytes = new Uint8Array(buffer)
    const contentType = resolveContentType(bytes, mimeFromExtension(localPath), localPath)
    return { bytes, contentType, label: basename(localPath) }
  }

  const downloadUrl = toDirectDownloadUrl(source)
  const res = await fetch(downloadUrl, {
    redirect: 'follow',
    headers: {
      // Helps some Drive endpoints return the file instead of an HTML interstitial.
      'User-Agent': 'HOMS-photo-uploader/1.0',
      Accept: 'image/jpeg,image/jpg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5',
    },
  })
  if (!res.ok) {
    throw new Error(`download failed (${res.status}) ${downloadUrl}`)
  }

  const contentTypeHeader = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  const arrayBuffer = await res.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  if (contentTypeHeader.includes('text/html')) {
    throw new Error(
      'download returned HTML (Drive file may not be publicly accessible — set sharing to "Anyone with the link")',
    )
  }

  const contentType = resolveContentType(bytes, contentTypeHeader, source)
  return { bytes, contentType, label: downloadUrl }
}

async function ensureBucket(admin) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets()
  if (listError) throw new Error(`listBuckets: ${listError.message}`)

  const existing = (buckets ?? []).find((b) => b.name === BUCKET || b.id === BUCKET)
  if (existing) {
    // Keep JPG/JPEG allowed even if the bucket was created earlier with a narrower list.
    const { error: updateError } = await admin.storage.updateBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: [...ALLOWED_MIME, 'image/jpg'],
    })
    if (updateError) {
      console.warn(`Could not update bucket MIME allow-list: ${updateError.message}`)
    }
    console.log(`Storage bucket "${BUCKET}" ready (public=${existing.public}, jpg/jpeg allowed).`)
    return
  }

  const { error: createError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: [...ALLOWED_MIME, 'image/jpg'],
  })
  if (createError) throw new Error(`createBucket: ${createError.message}`)
  console.log(`Created public storage bucket "${BUCKET}" (jpg/jpeg/png/webp).`)
}

async function resolveStudentFast(admin, row, emailIndex) {
  if (row.reg_number) {
    const { data, error } = await admin
      .from('students')
      .select('id, reg_number')
      .eq('reg_number', row.reg_number)
      .maybeSingle()
    if (error) throw new Error(`student lookup by reg: ${error.message}`)
    if (data?.id) return { id: data.id, identifier: sanitizePathSegment(data.reg_number) }
  }

  if (row.email && emailIndex.has(row.email)) {
    const id = emailIndex.get(row.email)
    const { data: student } = await admin
      .from('students')
      .select('id, reg_number')
      .eq('id', id)
      .maybeSingle()
    return {
      id,
      identifier: sanitizePathSegment(student?.reg_number || row.email.split('@')[0] || id),
    }
  }

  return null
}

function sanitizePathSegment(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'unknown'
}

async function buildEmailIndex(admin) {
  const map = new Map()
  let page = 1
  const perPage = 1000
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`auth listUsers page ${page}: ${error.message}`)
    const users = data?.users ?? []
    for (const user of users) {
      if (user.email) map.set(user.email.toLowerCase(), user.id)
    }
    if (users.length < perPage) break
    page += 1
    if (page > 50) break
  }
  return map
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let next = 0

  async function run() {
    while (next < items.length) {
      const i = next
      next += 1
      results[i] = await worker(items[i], i)
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run())
  await Promise.all(runners)
  return results
}

async function processRow(admin, row, mappingDir, emailIndex, dryRun) {
  const label = row.reg_number || row.email || `row-${row.index}`
  if (!row.source) {
    return { ok: false, label, error: 'missing photo_url / path' }
  }
  if (!row.email && !row.reg_number) {
    return { ok: false, label, error: 'missing email or reg_number' }
  }

  try {
    const student = await resolveStudentFast(admin, row, emailIndex)
    if (!student) {
      return { ok: false, label, error: 'student not found in DB' }
    }

    const photo = await readPhotoPayload(row.source, mappingDir)
    const ext = extensionForMime(photo.contentType)
    const objectPath = `photos/${student.identifier}.${ext}`

    if (dryRun) {
      console.log(`  [dry-run] ${label} → ${objectPath} (${photo.contentType}, ${photo.bytes.length} bytes)`)
      return { ok: true, label, path: objectPath, dryRun: true }
    }

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(objectPath, photo.bytes, {
      contentType: photo.contentType,
      upsert: true,
      cacheControl: '3600',
    })
    if (uploadError) {
      return { ok: false, label, error: `upload: ${uploadError.message}` }
    }

    const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(objectPath)
    const publicUrl = publicData?.publicUrl
    if (!publicUrl) {
      return { ok: false, label, error: 'getPublicUrl returned empty' }
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', student.id)

    if (updateError) {
      return { ok: false, label, error: `db update: ${updateError.message}` }
    }

    console.log(`  ✓ ${label} → ${objectPath}`)
    return { ok: true, label, path: objectPath, url: publicUrl }
  } catch (err) {
    return { ok: false, label, error: err instanceof Error ? err.message : String(err) }
  }
}

async function main() {
  loadDotEnv()

  const mappingPath = resolveMappingPath(process.argv[2])
  const mappingDir = dirname(mappingPath)
  const dryRun = process.env.PHOTO_DRY_RUN === '1' || process.argv.includes('--dry-run')
  const concurrency = Math.max(
    1,
    Number(process.env.PHOTO_CONCURRENCY ?? DEFAULT_CONCURRENCY) || DEFAULT_CONCURRENCY,
  )

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = await fetchServiceRoleKey()

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const rows = loadMapping(mappingPath)
  console.log(`Mapping: ${mappingPath}`)
  console.log(`Rows: ${rows.length} · concurrency: ${concurrency}${dryRun ? ' · DRY RUN' : ''}`)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  await ensureBucket(admin)
  console.log('Building email → user id index…')
  const emailIndex = await buildEmailIndex(admin)
  console.log(`Indexed ${emailIndex.size} auth users by email.`)

  const results = await mapPool(rows, concurrency, async (row) => {
    const result = await processRow(admin, row, mappingDir, emailIndex, dryRun)
    if (!result.ok) {
      console.warn(`  ✗ ${result.label}: ${result.error}`)
    }
    return result
  })

  const ok = results.filter((r) => r?.ok).length
  const failed = results.filter((r) => r && !r.ok).length
  console.log('\n── Summary ────────────────────────────')
  console.log(`Successful: ${ok}`)
  console.log(`Failed:     ${failed}`)
  console.log(`Total:      ${rows.length}`)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
