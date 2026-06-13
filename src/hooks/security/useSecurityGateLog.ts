import { useCallback, useEffect, useMemo, useState } from 'react'
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
}

export interface GateLogSummary {
  exits: number
  entries: number
  currentlyOutside: number
}

const HISTORY_DAYS = 30

function historyStartIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - HISTORY_DAYS)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfTodayIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString()
}

async function enrichGateLogs(logs: GateLog[]): Promise<EnrichedGateLog[]> {
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
    }
  })
}

export function useSecurityGateLog(enabled = true) {
  const [logs, setLogs] = useState<EnrichedGateLog[]>([])
  const [recentRawLogs, setRecentRawLogs] = useState<GateLog[]>([])
  const [activePasses, setActivePasses] = useState<OutpassWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    const [historyResult, passesResult] = await Promise.all([
      supabase
        .from('gate_logs')
        .select('*')
        .gte('scanned_at', historyStartIso())
        .order('scanned_at', { ascending: false })
        .limit(500),
      supabase
        .from('outpass_requests')
        .select('*')
        .in('status', ['approved', 'extended']),
    ])

    if (historyResult.error) {
      setError(historyResult.error.message)
      setLoading(false)
      return
    }

    const rawLogs = (historyResult.data ?? []) as GateLog[]
    setRecentRawLogs(rawLogs)
    setLogs(await enrichGateLogs(rawLogs))

    if (!passesResult.error) {
      setActivePasses((passesResult.data ?? []) as OutpassWithStudent[])
    }

    setLoading(false)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    fetchData()

    const channel = supabase
      .channel('security-gate-log')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () =>
        fetchData(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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
    const groups = new Map<string, EnrichedGateLog[]>()

    for (const log of logs) {
      const dateKey = new Date(log.scanned_at).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      const existing = groups.get(dateKey) ?? []
      existing.push(log)
      groups.set(dateKey, existing)
    }

    return [...groups.entries()]
  }, [logs])

  return {
    logs,
    logsByDate,
    summary,
    loading,
    error,
    refetch: fetchData,
  }
}
