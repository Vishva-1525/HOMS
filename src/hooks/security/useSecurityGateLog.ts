import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getStudentName, getStudentRoom, isStudentCurrentlyOut } from '@/lib/warden'
import type { GateLog, OutpassWithStudent, PassType } from '@/lib/types'

export interface GateLogRow extends GateLog {
  outpass_requests: {
    pass_type: PassType
    status: string
    students: {
      reg_number: string
      room_number: string
      hostel_block: string
      profiles: { full_name: string } | null
    } | null
  } | null
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
}

function sevenDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

export interface GateLogSummary {
  exits: number
  entries: number
  currentlyOutside: number
}

export function useSecurityGateLog() {
  const [todayLogs, setTodayLogs] = useState<GateLogRow[]>([])
  const [recentLogs, setRecentLogs] = useState<GateLog[]>([])
  const [activePasses, setActivePasses] = useState<OutpassWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setError(null)
    const todayStart = startOfToday().toISOString()

    const [todayResult, recentResult, passesResult] = await Promise.all([
      supabase
        .from('gate_logs')
        .select(
          `
          *,
          outpass_requests (
            pass_type,
            status,
            students (
              reg_number,
              room_number,
              hostel_block,
              profiles ( full_name )
            )
          )
        `,
        )
        .gte('scanned_at', todayStart)
        .order('scanned_at', { ascending: false })
        .limit(200),
      supabase
        .from('gate_logs')
        .select('*')
        .gte('scanned_at', sevenDaysAgo())
        .order('scanned_at', { ascending: false })
        .limit(500),
      supabase
        .from('outpass_requests')
        .select(
          `
          *,
          students (
            reg_number,
            room_number,
            hostel_block,
            profiles ( full_name )
          )
        `,
        )
        .in('status', ['approved', 'extended']),
    ])

    if (todayResult.error) {
      setError(todayResult.error.message)
    } else {
      setTodayLogs((todayResult.data ?? []) as GateLogRow[])
    }

    if (!recentResult.error) {
      setRecentLogs((recentResult.data ?? []) as GateLog[])
    }

    if (!passesResult.error) {
      setActivePasses((passesResult.data ?? []) as OutpassWithStudent[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
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
  }, [fetchData])

  const summary = useMemo((): GateLogSummary => {
    const exits = todayLogs.filter((log) => log.event_type === 'exit').length
    const entries = todayLogs.filter((log) => log.event_type === 'entry').length
    const currentlyOutside = activePasses.filter((pass) =>
      isStudentCurrentlyOut(pass, recentLogs),
    ).length

    return { exits, entries, currentlyOutside }
  }, [todayLogs, recentLogs, activePasses])

  return {
    logs: todayLogs,
    summary,
    loading,
    error,
    refetch: fetchData,
    getStudentName: (row: GateLogRow) => getStudentName(row.outpass_requests?.students ?? null),
    getStudentRoom: (row: GateLogRow) => getStudentRoom(row.outpass_requests?.students ?? null),
  }
}
