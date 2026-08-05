import { supabase } from '@/lib/supabase'
import {
  fetchAdmissionNosByStudentIds,
  fetchStudentProfilesByIds,
} from '@/lib/student-details'
import type { ExtensionRequest, GateLog, OutpassWithStudent } from '@/lib/types'
import {
  putAdmissionNos,
  putEntryCodes,
  putExtensions,
  putGateLogs,
  putPasses,
  putScannerNames,
  setMeta,
  getMeta,
  type CachedAdmissionNo,
  type CachedEntryCode,
} from '@/lib/offline/security-db'

const ACTIVE_PASS_LOOKBACK_DAYS = 90
const PREFETCH_CHUNK = 50

function activePassCutoffIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - ACTIVE_PASS_LOOKBACK_DAYS)
  return d.toISOString()
}

async function fetchActivePasses(): Promise<OutpassWithStudent[]> {
  const { data, error } = await supabase
    .from('outpass_requests')
    .select('*')
    .in('status', ['approved', 'extended'])
    .or(`is_overdue.eq.true,created_at.gte.${activePassCutoffIso()}`)
    .limit(500)

  if (error) throw new Error(error.message)

  const passes = (data ?? []) as OutpassWithStudent[]
  const studentIds = [...new Set(passes.map((p) => p.student_id))]
  const profileMap = await fetchStudentProfilesByIds(studentIds)

  return passes.map((pass) => ({
    ...pass,
    students: profileMap.get(pass.student_id) ?? null,
  }))
}

async function fetchGateLogsForPasses(passIds: string[]): Promise<GateLog[]> {
  const all: GateLog[] = []
  for (let i = 0; i < passIds.length; i += PREFETCH_CHUNK) {
    const chunk = passIds.slice(i, i + PREFETCH_CHUNK)
    const { data, error } = await supabase
      .from('gate_logs')
      .select('*')
      .in('outpass_id', chunk)
      .order('scanned_at', { ascending: false })

    if (error) throw new Error(error.message)
    all.push(...((data ?? []) as GateLog[]))
  }
  return all
}

async function fetchExtensionsForPasses(passIds: string[]): Promise<ExtensionRequest[]> {
  const all: ExtensionRequest[] = []
  for (let i = 0; i < passIds.length; i += PREFETCH_CHUNK) {
    const chunk = passIds.slice(i, i + PREFETCH_CHUNK)
    const { data, error } = await supabase
      .from('extension_requests')
      .select('*')
      .in('outpass_id', chunk)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    all.push(...((data ?? []) as ExtensionRequest[]))
  }
  return all
}

async function fetchScannerNameRows(logs: GateLog[]) {
  const ids = [...new Set(logs.map((log) => log.scanned_by).filter(Boolean))]
  if (ids.length === 0) return []

  const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids)
  return (data ?? []).map((row) => ({ id: row.id, full_name: row.full_name }))
}

export interface SecurityPrefetchResult {
  passCount: number
  gateLogCount: number
  syncedAt: string
}

/** Download active passes and related gate data for offline security scanning. */
export async function prefetchSecurityCache(): Promise<SecurityPrefetchResult> {
  const passes = await fetchActivePasses()
  const passIds = passes.map((p) => p.id)

  const [gateLogs, extensions] = await Promise.all([
    fetchGateLogsForPasses(passIds),
    fetchExtensionsForPasses(passIds),
  ])

  const profileMap = new Map(
    passes
      .map((p) => [p.student_id, p.students])
      .filter((entry): entry is [string, NonNullable<OutpassWithStudent['students']>] =>
        Boolean(entry[1]),
      ),
  )
  const admissionMap = await fetchAdmissionNosByStudentIds(profileMap)
  const scannerRows = await fetchScannerNameRows(gateLogs)

  const admissionRows: CachedAdmissionNo[] = [...admissionMap.entries()].map(
    ([student_id, admission_no]) => ({ student_id, admission_no }),
  )

  const entryCodeRows: CachedEntryCode[] = passes
    .filter((pass) => pass.entry_code?.trim())
    .map((pass) => ({ code: pass.entry_code!.trim(), outpass_id: pass.id }))

  await Promise.all([
    putPasses(passes),
    putGateLogs(gateLogs),
    putExtensions(extensions),
    putAdmissionNos(admissionRows),
    putEntryCodes(entryCodeRows),
    putScannerNames(scannerRows),
  ])

  const syncedAt = new Date().toISOString()
  await setMeta('last_prefetch_at', syncedAt)
  await setMeta('pass_count', String(passes.length))

  return {
    passCount: passes.length,
    gateLogCount: gateLogs.length,
    syncedAt,
  }
}

export async function getLastPrefetchAt(): Promise<string | null> {
  return getMeta('last_prefetch_at')
}
