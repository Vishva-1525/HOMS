import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdminPassRow } from '@/lib/admin-types'
import type { PassClassificationFilter } from '@/components/shared/PassListFilters'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatNetworkError } from '@/lib/network-error'
import { debounce } from '@/lib/debounce'
import {
  invalidateCachedQuery,
  peekCachedQuery,
  setCachedQuery,
} from '@/lib/query-cache'
import { supabase } from '@/lib/supabase'
import type { GateLog, OutpassRequest, OutpassStatus, PassType } from '@/lib/types'
import { getEntryTime, getExitTime } from '@/lib/warden'

const PAGE_SIZE = 25
const REALTIME_DEBOUNCE_MS = 800
const PAGE_TTL_MS = 20_000

type PassWithStudent = OutpassRequest & {
  students: {
    reg_number: string
    room_number: string
    hostel_block: string
    profiles: { full_name: string } | null
  } | null
}

interface PagePayload {
  rows: AdminPassRow[]
  totalCount: number
}

const PASS_COLUMNS = `
  id,
  student_id,
  pass_type,
  destination,
  reason,
  departure_at,
  return_by,
  status,
  created_at,
  is_overdue,
  approved_by,
  warden_remark,
  admin_override_note,
  students (
    reg_number,
    room_number,
    hostel_block,
    profiles ( full_name )
  )
`

function mapPassRow(p: PassWithStudent, pageLogs: GateLog[]): AdminPassRow {
  const gate_logs = pageLogs.filter((log) => log.outpass_id === p.id)
  return {
    pass: p,
    student_id: p.student_id,
    student_name: p.students?.profiles?.full_name ?? '—',
    reg_number: p.students?.reg_number ?? '—',
    room_number: p.students?.room_number ?? '—',
    hostel_block: p.students?.hostel_block ?? '—',
    exit_at: getExitTime(p.id, gate_logs),
    entry_at: getEntryTime(p.id, gate_logs),
    gate_logs,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStatusFilter(query: any, statusFilter: PassClassificationFilter) {
  switch (statusFilter) {
    case 'pending':
      return query.eq('status', 'pending')
    case 'approved':
      return query.in('status', ['approved', 'extended']).eq('is_overdue', false)
    case 'rejected':
      return query.eq('status', 'rejected')
    case 'cancelled':
      return query.eq('status', 'cancelled')
    case 'overdue':
      return query.eq('is_overdue', true)
    case 'expired':
      return query
        .in('status', ['approved', 'extended'])
        .eq('is_overdue', false)
        .lt('return_by', new Date().toISOString())
    case 'return_completed':
      return query.in('status', ['approved', 'extended'])
    case 'completed':
      return query.eq('status', 'cancelled')
    case 'all':
    default:
      return query
  }
}

function pageCacheKey(
  page: number,
  name: string,
  reg: string,
  status: string,
  type: string,
  from: string,
  to: string,
) {
  return `admin-passes:page:${page}:${name}:${reg}:${status}:${type}:${from}:${to}`
}

export function useAdminPasses() {
  const [rows, setRows] = useState<AdminPassRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [nameSearch, setNameSearch] = useState('')
  const [regSearch, setRegSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PassClassificationFilter>('all')
  const [typeFilter, setTypeFilter] = useState<PassType | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const debouncedName = useDebouncedValue(nameSearch, 300)
  const debouncedReg = useDebouncedValue(regSearch, 300)

  const pageSize = PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const fetchDataRef = useRef<(force?: boolean) => Promise<void>>(async () => {})

  const fetchData = useCallback(async (force = false) => {
    const cacheKey = pageCacheKey(
      page,
      debouncedName.trim(),
      debouncedReg.trim(),
      statusFilter,
      typeFilter,
      dateFrom,
      dateTo,
    )

    if (!force) {
      const stale = peekCachedQuery<PagePayload>(cacheKey)
      if (stale) {
        setRows(stale.rows)
        setTotalCount(stale.totalCount)
        setLoading(false)
      } else {
        setLoading(true)
      }
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const nameQ = debouncedName.trim()
      const regQ = debouncedReg.trim()

      let studentIdFilter: string[] | null = null
      if (nameQ || regQ) {
        let studentQuery = supabase.from('students').select('id, profiles!inner(full_name)')
        if (regQ) studentQuery = studentQuery.ilike('reg_number', `%${regQ}%`)
        if (nameQ) studentQuery = studentQuery.ilike('profiles.full_name', `%${nameQ}%`)
        const { data: studentHits, error: studentError } = await studentQuery.limit(500)
        if (studentError) {
          setError(formatNetworkError(studentError.message))
          if (!peekCachedQuery(cacheKey)) {
            setRows([])
            setTotalCount(0)
          }
          return
        }
        studentIdFilter = (studentHits ?? []).map((s) => s.id as string)
        if (studentIdFilter.length === 0) {
          setRows([])
          setTotalCount(0)
          setCachedQuery(cacheKey, { rows: [], totalCount: 0 }, PAGE_TTL_MS)
          return
        }
      }

      let query = applyStatusFilter(
        supabase.from('outpass_requests').select(PASS_COLUMNS, { count: 'exact' }),
        statusFilter,
      )
        .order('created_at', { ascending: false })
        .range(from, to)

      if (typeFilter !== 'all') query = query.eq('pass_type', typeFilter)
      if (dateFrom) query = query.gte('departure_at', new Date(dateFrom).toISOString())
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        query = query.lte('departure_at', end.toISOString())
      }
      if (studentIdFilter) query = query.in('student_id', studentIdFilter)

      const { data, error: passError, count } = await query

      if (passError) {
        setError(formatNetworkError(passError.message))
        if (!peekCachedQuery(cacheKey)) {
          setRows([])
          setTotalCount(0)
        }
        return
      }

      const passPage = (data ?? []) as PassWithStudent[]
      const passIds = passPage.map((p) => p.id)

      let pageLogs: GateLog[] = []
      if (passIds.length > 0) {
        const { data: logs, error: logsError } = await supabase
          .from('gate_logs')
          .select('id, outpass_id, event_type, scanned_at, scanned_by')
          .in('outpass_id', passIds)
        if (logsError) {
          console.warn('gate_logs page lookup soft-failed:', logsError.message)
        } else {
          pageLogs = (logs ?? []) as GateLog[]
        }
      }

      const mapped = passPage.map((p) => mapPassRow(p, pageLogs))
      const payload: PagePayload = { rows: mapped, totalCount: count ?? mapped.length }
      setCachedQuery(cacheKey, payload, PAGE_TTL_MS)
      setRows(mapped)
      setTotalCount(payload.totalCount)
    } catch (err) {
      setError(formatNetworkError(err, 'Failed to load passes.'))
      if (!peekCachedQuery(cacheKey)) {
        setRows([])
        setTotalCount(0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, debouncedName, debouncedReg, statusFilter, typeFilter, dateFrom, dateTo])

  fetchDataRef.current = fetchData

  useEffect(() => {
    setPage(1)
  }, [debouncedName, debouncedReg, statusFilter, typeFilter, dateFrom, dateTo])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Defer realtime until after first paint so WebSocket setup does not contend with initial fetch.
  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelRefresh: (() => void) | undefined

    const timer = window.setTimeout(() => {
      if (cancelled) return
      const scheduleRefresh = debounce(() => {
        void fetchDataRef.current(true)
      }, REALTIME_DEBOUNCE_MS)
      cancelRefresh = () => scheduleRefresh.cancel()

      channel = supabase
        .channel('admin-passes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'outpass_requests' },
          () => scheduleRefresh(),
        )
        .subscribe()
    }, 1500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      cancelRefresh?.()
      if (channel) void supabase.removeChannel(channel)
    }
  }, [])

  async function overridePassStatus(passId: string, status: OutpassStatus, note: string) {
    const { error: updateError } = await supabase
      .from('outpass_requests')
      .update({
        status,
        admin_override_note: note.trim() || null,
      })
      .eq('id', passId)

    if (updateError) throw new Error(updateError.message)
    invalidateCachedQuery('admin-passes:')
    await fetchData(true)
  }

  return {
    rows,
    data: rows,
    totalCount,
    total: totalCount,
    page,
    pageSize,
    totalPages,
    setPage,
    loading,
    error,
    nameSearch,
    setNameSearch,
    regSearch,
    setRegSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    overridePassStatus,
    refetch: async () => {
      invalidateCachedQuery('admin-passes:')
      await fetchData(true)
    },
  }
}
