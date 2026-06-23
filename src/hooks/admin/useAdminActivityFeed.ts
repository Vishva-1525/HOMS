import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdminActivityEventType, AdminActivityRow } from '@/lib/admin-types'
import { PASS_TYPE_LABELS } from '@/lib/outpass'
import { formatRelativeTime } from '@/lib/relative-time'
import { supabase } from '@/lib/supabase'

const DOT_COLORS: Record<AdminActivityEventType, string> = {
  request_submitted: '#D97706',
  request_approved: '#2E8B44',
  request_rejected: '#DC2626',
  gate_exit: '#1A5CA0',
  gate_entry: '#2E8B44',
  overdue_alert: '#DC2626',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return fullName
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function buildActivityDescription(row: AdminActivityRow): string {
  const name = row.student_name ? shortName(row.student_name) : 'Student'
  const reg = row.reg_number ?? '—'
  const passLabel = PASS_TYPE_LABELS[row.pass_type as keyof typeof PASS_TYPE_LABELS] ?? row.pass_type

  switch (row.event_type) {
    case 'request_submitted':
      return `${name} (${reg}) submitted a ${passLabel} request`
    case 'request_approved':
      return `Outpass approved for ${name} (${reg}) · Destination: ${row.destination}`
    case 'request_rejected':
      return `Outpass rejected for ${name} (${reg})${row.warden_remark ? ` · Reason: ${row.warden_remark}` : ''}`
    case 'gate_exit':
      return `${name} (${reg}) exited hostel at ${formatTime(row.scanned_at ?? row.occurred_at)}`
    case 'gate_entry':
      return `${name} (${reg}) returned to hostel at ${formatTime(row.scanned_at ?? row.occurred_at)}`
    case 'overdue_alert':
      return `${name} (${reg}) is OVERDUE — expected return ${formatTime(row.return_by)}`
    default:
      return `${name} (${reg})`
  }
}

async function enrichActivityRows(rows: AdminActivityRow[]): Promise<AdminActivityRow[]> {
  const studentIds = [...new Set(rows.map((r) => r.student_id))]
  if (studentIds.length === 0) return rows

  const { data: students } = await supabase
    .from('students')
    .select('id, reg_number, profiles(full_name)')
    .in('id', studentIds)

  const byId = new Map(
    (students ?? []).map((s) => [
      s.id,
      {
        reg_number: s.reg_number as string,
        full_name: (s.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Student',
      },
    ]),
  )

  return rows.map((row) => {
    const student = byId.get(row.student_id)
    return {
      ...row,
      student_name: student?.full_name,
      reg_number: student?.reg_number,
    }
  })
}

export function useAdminActivityFeed() {
  const [events, setEvents] = useState<AdminActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const fetchFeed = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_admin_activity_feed', { p_limit: 30 })
    if (error) {
      console.error(error.message)
      return
    }
    const rows = (data as AdminActivityRow[]) ?? []
    setEvents(await enrichActivityRows(rows))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchFeed().finally(() => setLoading(false))

    const channel = supabase
      .channel('admin-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outpass_requests' }, () =>
        fetchFeed(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () =>
        fetchFeed(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFeed])

  useEffect(() => {
    const interval = window.setInterval(() => setTick((t) => t + 1), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const feedItems = useMemo(
    () =>
      events.map((row) => ({
        id: `${row.event_type}-${row.source_id}-${row.occurred_at}`,
        row,
        dotColor: DOT_COLORS[row.event_type],
        pulse: row.event_type === 'overdue_alert',
        description: buildActivityDescription(row),
        relativeTime: formatRelativeTime(row.occurred_at),
        studentId: row.student_id,
        studentLabel: `${row.student_name ?? 'Student'} · ${row.reg_number ?? '—'}`,
      })),
    [events, tick],
  )

  return { feedItems, loading, refetch: fetchFeed }
}
