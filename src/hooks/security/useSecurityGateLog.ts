import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { debounce } from '@/lib/debounce'
import { supabase } from '@/lib/supabase'
import {
  fetchAdmissionNosByStudentIds,
  fetchStudentProfilesByIds,
} from '@/lib/student-details'
import { formatStudentRoomDisplay, getStudentName, isStudentCurrentlyOut } from '@/lib/warden'
import type { GateLog, OutpassWithStudent, PassType } from '@/lib/types'

export interface EnrichedGateLog {
  id: string
  outpass_id: string
  scanned_by: string
  event_type: GateLog['event_type']
  scanned_at: string
  studentName: string
  admissionNo: string
  room: string
  passType: PassType | null
  destination: string
  scannerName: string
}

export type PassScanStatus = 'outside' | 'returned' | 'exit_only' | 'incomplete'

export interface PassScanHistoryRow {
  outpass_id: string
  studentName: string
  admissionNo: string
  room: string
  destination: string
  passType: PassType | null
  exitAt: string | null
  entryAt: string | null
  exitScanner: string | null
  entryScanner: string | null
  status: PassScanStatus
  lastActivityAt: string
}

export interface GateLogSummary {
  exits: number
  entries: number
  currentlyOutside: number
}

const HISTORY_DAYS = 30
const REALTIME_DEBOUNCE_MS = 500
const ACTIVE_PASS_LOOKBACK_DAYS = 90

function historyStartIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - HISTORY_DAYS)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function activePassCutoffIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - ACTIVE_PASS_LOOKBACK_DAYS)
  return d.toISOString()
}

function startOfTodayIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString()
}

function derivePassStatus(exitAt: string | null, entryAt: string | null): PassScanStatus {
  if (exitAt && entryAt) return 'returned'
  if (exitAt && !entryAt) return 'outside'
  if (!exitAt && entryAt) return 'incomplete'
  return 'incomplete'
}

async function fetchScannerNameMap(logs: GateLog[]): Promise<Record<string, string>> {
  const ids = [...new Set(logs.map((log) => log.scanned_by).filter(Boolean))]
  if (ids.length === 0) return {}

  const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids)
  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    map[row.id] = row.full_name
  }
  return map
}

async function enrichGateLogs(
  logs: GateLog[],
  scannerMap: Record<string, string>,
): Promise<EnrichedGateLog[]> {
  if (logs.length === 0) return []

  const outpassIds = [...new Set(logs.map((log) => log.outpass_id))]
  const { data: passes } = await supabase
    .from('outpass_requests')
    .select('id, student_id, pass_type, destination')
    .in('id', outpassIds)

  const passById = new Map((passes ?? []).map((p) => [p.id, p]))
  const studentIds = [...new Set((passes ?? []).map((p) => p.student_id))]
  const profileMap = await fetchStudentProfilesByIds(studentIds)
  const admissionMap = await fetchAdmissionNosByStudentIds(profileMap)

  return logs.map((log) => {
    const pass = passById.get(log.outpass_id)
    const student = pass ? profileMap.get(pass.student_id) : undefined
    const admissionNo = pass ? admissionMap.get(pass.student_id) : undefined

    return {
      id: log.id,
      outpass_id: log.outpass_id,
      scanned_by: log.scanned_by,
      event_type: log.event_type,
      scanned_at: log.scanned_at,
      studentName: getStudentName(student ?? null),
      admissionNo: admissionNo ?? '—',
      room: formatStudentRoomDisplay(student ?? null),
      passType: (pass?.pass_type as PassType | undefined) ?? null,
      destination: pass?.destination ?? '—',
      scannerName: scannerMap[log.scanned_by] ?? 'Unknown guard',
    }
  })
}

function buildPassScanHistory(logs: EnrichedGateLog[]): PassScanHistoryRow[] {
  const byPass = new Map<string, PassScanHistoryRow>()

  for (const log of logs) {
    const existing = byPass.get(log.outpass_id) ?? {
      outpass_id: log.outpass_id,
      studentName: log.studentName,
      admissionNo: log.admissionNo,
      room: log.room,
      destination: log.destination,
      passType: log.passType,
      exitAt: null,
      entryAt: null,
      exitScanner: null,
      entryScanner: null,
      status: 'incomplete' as PassScanStatus,
      lastActivityAt: log.scanned_at,
    }

    if (log.event_type === 'exit') {
      existing.exitAt = log.scanned_at
      existing.exitScanner = log.scannerName
    } else {
      existing.entryAt = log.scanned_at
      existing.entryScanner = log.scannerName
    }

    if (log.scanned_at > existing.lastActivityAt) {
      existing.lastActivityAt = log.scanned_at
    }

    existing.status = derivePassStatus(existing.exitAt, existing.entryAt)
    byPass.set(log.outpass_id, existing)
  }

  return [...byPass.values()].sort(
    (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime(),
  )
}

export function useSecurityGateLog(enabled = true) {
  const [logs, setLogs] = useState<EnrichedGateLog[]>([])
  const [passHistory, setPassHistory] = useState<PassScanHistoryRow[]>([])
  const [recentRawLogs, setRecentRawLogs] = useState<GateLog[]>([])
  const [activePasses, setActivePasses] = useState<OutpassWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inFlightRef = useRef<Promise<void> | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return
    if (inFlightRef.current) {
      await inFlightRef.current
      return
    }

    const run = (async () => {
      setLoading(true)
      setError(null)

      const [historyResult, passesResult] = await Promise.all([
        supabase
          .from('gate_logs')
          .select('id, outpass_id, scanned_by, event_type, scanned_at')
          .gte('scanned_at', historyStartIso())
          .order('scanned_at', { ascending: false })
          .limit(500),
        supabase
          .from('outpass_requests')
          .select(
            `
            id,
            student_id,
            pass_type,
            destination,
            departure_at,
            return_by,
            status,
            is_overdue,
            created_at,
            students (
              reg_number,
              room_number,
              hostel_block,
              profiles ( full_name )
            )
          `,
          )
          .in('status', ['approved', 'extended'])
          .or(`is_overdue.eq.true,created_at.gte.${activePassCutoffIso()}`)
          .limit(400),
      ])

      if (historyResult.error) {
        setError(historyResult.error.message)
        setLoading(false)
        return
      }

      const rawLogs = (historyResult.data ?? []) as GateLog[]
      setRecentRawLogs(rawLogs)

      const scannerMap = await fetchScannerNameMap(rawLogs)
      const enriched = await enrichGateLogs(rawLogs, scannerMap)
      setLogs(enriched)

      const passes = (
        passesResult.error ? [] : ((passesResult.data ?? []) as unknown as OutpassWithStudent[])
      )
      setActivePasses(passes)
      setPassHistory(buildPassScanHistory(enriched))
      setLoading(false)
    })()

    inFlightRef.current = run
    try {
      await run
    } finally {
      inFlightRef.current = null
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    void fetchData()

    const scheduleRefresh = debounce(() => {
      void fetchData()
    }, REALTIME_DEBOUNCE_MS)

    const channel = supabase
      .channel('security-gate-log')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () =>
        scheduleRefresh(),
      )
      .subscribe()

    return () => {
      scheduleRefresh.cancel()
      void supabase.removeChannel(channel)
    }
  }, [enabled, fetchData])

  const summary = useMemo((): GateLogSummary => {
    const todayStart = startOfTodayIso()
    const todayLogs = logs.filter((log) => log.scanned_at >= todayStart)
    const exits = todayLogs.filter((log) => log.event_type === 'exit').length
    const entries = todayLogs.filter((log) => log.event_type === 'entry').length
    const currentlyOutside = activePasses.filter((pass) =>
      isStudentCurrentlyOut(pass, recentRawLogs),
    ).length

    return { exits, entries, currentlyOutside }
  }, [logs, recentRawLogs, activePasses])

  const logsByDate = useMemo(() => {
    const groups = new Map<string, PassScanHistoryRow[]>()

    for (const row of passHistory) {
      const dateKey = new Date(row.lastActivityAt).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      const existing = groups.get(dateKey) ?? []
      existing.push(row)
      groups.set(dateKey, existing)
    }

    return [...groups.entries()]
  }, [passHistory])

  return {
    logs,
    passHistory,
    logsByDate,
    summary,
    loading,
    error,
    refetch: fetchData,
  }
}
