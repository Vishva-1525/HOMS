/**
 * Upload local JPG student photos to Supabase Storage and set profiles.avatar_url.
 *
 * Filenames must be the student roll / reg number, e.g. 2023CS0485.jpg
 * Matched against public.students.reg_number (case-insensitive).
 *
 * Usage:
 *   node scripts/upload-local-student-photos.mjs [path/to/students_photos]
 *
 * Defaults to ../students_photos (sibling of HOMS project) then ./students_photos
 *
 * Env:
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PHOTO_CONCURRENCY (default 6)
 *   PHOTO_DRY_RUN=1
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const BUCKET = 'student-profiles'
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.jpe', '.png', '.webp'])
const DEFAULT_CONCURRENCY = 6

const DEFAULT_DIRS = [
  resolve(projectRoot, '../students_photos'),
  resolve(projectRoot, 'students_photos'),
  resolve(projectRoot, 'student_photos'),
  resolve(projectRoot, '../student_photos'),
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

function resolvePhotosDir(arg) {
  if (arg) {
    const path = isAbsolute(arg) ? arg : resolve(process.cwd(), arg)
    if (!existsSync(path) || !statSync(path).isDirectory()) {
      throw new Error(`Photos directory not found: ${path}`)
    }
    return path
  }
  for (const candidate of DEFAULT_DIRS) {
    if (existsSync(candidate) && statSync(candidate).isDirectory()) return candidate
  }
  throw new Error(
    `No photos folder found. Pass a path or create one of:\n  ${DEFAULT_DIRS.join('\n  ')}`,
  )
}

function listImageFiles(dir) {
  return readdirSync(dir)
    .filter((name) => ALLOWED_EXT.has(extname(name).toLowerCase()))
    .map((name) => {
      const ext = extname(name)
      const roll = basename(name, ext).trim()
      return {
        fileName: name,
        fullPath: join(dir, name),
        roll,
        rollKey: roll.toLowerCase(),
        ext: ext.toLowerCase() === '.jpeg' || ext.toLowerCase() === '.jpe' ? '.jpg' : ext.toLowerCase(),
      }
    })
    .filter((f) => f.roll.length > 0)
}

function contentTypeForExt(ext) {
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return 'image/jpeg'
}

async function ensureBucket(admin) {
  const { data: buckets, error } = await admin.storage.listBuckets()
  if (error) throw new Error(`listBuckets: ${error.message}`)
  const existing = (buckets ?? []).find((b) => b.name === BUCKET || b.id === BUCKET)
  if (existing) {
    await admin.storage.updateBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    })
    console.log(`Bucket "${BUCKET}" ready.`)
    return
  }
  const { error: createError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  })
  if (createError) throw new Error(`createBucket: ${createError.message}`)
  console.log(`Created bucket "${BUCKET}".`)
}

/** Build map: lowercase(reg_number) → { id, reg_number } */
async function buildStudentIndex(admin) {
  const map = new Map()
  const pageSize = 1000
  let from = 0
  for (;;) {
    const { data, error } = await admin
      .from('students')
      .select('id, reg_number')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`students list: ${error.message}`)
    const rows = data ?? []
    for (const row of rows) {
      if (!row.reg_number) continue
      map.set(String(row.reg_number).trim().toLowerCase(), {
        id: row.id,
        reg_number: row.reg_number,
      })
    }
    if (rows.length < pageSize) break
    from += pageSize
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
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()))
  return results
}

async function processFile(admin, file, studentIndex, dryRun, index, total) {
  const prefix = `[${index + 1}/${total}] ${file.fileName}`
  const student = studentIndex.get(file.rollKey)
  if (!student) {
    console.warn(`  ✗ ${prefix}: no student with reg_number="${file.roll}"`)
    return { ok: false, roll: file.roll, error: 'student not found' }
  }

  const objectPath = `photos/${student.reg_number}${file.ext === '.jpg' ? '.jpg' : file.ext}`
  const contentType = contentTypeForExt(file.ext)

  try {
    const bytes = readFileSync(file.fullPath)

    if (dryRun) {
      console.log(`  [dry-run] ${prefix} → ${objectPath} (${bytes.length} bytes, student ${student.id})`)
      return { ok: true, roll: file.roll, dryRun: true }
    }

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(objectPath, bytes, {
      contentType,
      upsert: true,
      cacheControl: '3600',
    })
    if (uploadError) {
      console.warn(`  ✗ ${prefix}: upload failed — ${uploadError.message}`)
      return { ok: false, roll: file.roll, error: uploadError.message }
    }

    const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(objectPath)
    const publicUrl = publicData?.publicUrl
    if (!publicUrl) {
      console.warn(`  ✗ ${prefix}: empty public URL`)
      return { ok: false, roll: file.roll, error: 'empty public url' }
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', student.id)

    if (updateError) {
      console.warn(`  ✗ ${prefix}: DB update failed — ${updateError.message}`)
      return { ok: false, roll: file.roll, error: updateError.message }
    }

    console.log(`  ✓ ${prefix} → ${objectPath}`)
    return { ok: true, roll: file.roll, url: publicUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`  ✗ ${prefix}: ${message}`)
    return { ok: false, roll: file.roll, error: message }
  }
}

async function main() {
  loadDotEnv()

  const photosDir = resolvePhotosDir(process.argv[2])
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

  const files = listImageFiles(photosDir)
  console.log(`Photos dir: ${photosDir}`)
  console.log(`Image files: ${files.length} · concurrency: ${concurrency}${dryRun ? ' · DRY RUN' : ''}`)

  if (files.length === 0) {
    console.error('No .jpg/.jpeg/.png/.webp files found.')
    process.exit(1)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  await ensureBucket(admin)
  console.log('Loading students.reg_number index…')
  const studentIndex = await buildStudentIndex(admin)
  console.log(`Indexed ${studentIndex.size} students.`)

  const results = await mapPool(files, concurrency, (file, i) =>
    processFile(admin, file, studentIndex, dryRun, i, files.length),
  )

  const ok = results.filter((r) => r?.ok).length
  const failed = results.filter((r) => r && !r.ok).length
  console.log('\n── Summary ────────────────────────────')
  console.log(`Successful: ${ok}`)
  console.log(`Failed:     ${failed}`)
  console.log(`Total:      ${files.length}`)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
