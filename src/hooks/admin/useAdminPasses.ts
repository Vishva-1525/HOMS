import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdminPassRow } from '@/lib/admin-types'
import { getExitTime, getEntryTime } from '@/lib/warden'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { supabase } from '@/lib/supabase'
import type { GateLog, OutpassRequest, OutpassStatus, PassType } from '@/lib/types'

export type PassStatusFilter = 'all' | OutpassStatus | 'overdue' | 'completed'

const PAGE_SIZE = 25

export function useAdminPasses() {
  const [rows, setRows] = useState<AdminPassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PassStatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<PassType | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)

  const fetchData = useCallback(async () => {
    setError(null)

    const { data: passes, error: passError } = await supabase
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
      .order('created_at', { ascending: false })

    if (passError) {
      setError(passError.message)
      setLoading(false)
      return
    }

    const allPasses = (passes ?? []) as (OutpassRequest & {
      students: {
        reg_number: string
        room_number: string
        hostel_block: string
        profiles: { full_name: string } | null
      } | null
    })[]

    const passIds = allPasses.map((p) => p.id)
    let gateLogs: GateLog[] = []
    if (passIds.length > 0) {
      const { data: logs } = await supabase.from('gate_logs').select('*').in('outpass_id', passIds)
      gateLogs = (logs ?? []) as GateLog[]
    }

    const mapped: AdminPassRow[] = allPasses.map((p) => ({
      pass: p,
      student_name: p.students?.profiles?.full_name ?? '—',
      reg_number: p.students?.reg_number ?? '—',
      room_number: p.students?.room_number ?? '—',
      hostel_block: p.students?.hostel_block ?? '—',
      exit_at: getExitTime(p.id, gateLogs),
      entry_at: getEntryTime(p.id, gateLogs),
    }))

    setRows(mapped)
    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData()

    const channel = supabase
      .channel('admin-passes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outpass_requests' }, () =>
        fetchData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () =>
        fetchData(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()

    return rows.filter(({ pass, student_name, reg_number, entry_at }) => {
      if (typeFilter !== 'all' && pass.pass_type !== typeFilter) return false

      if (dateFrom && new Date(pass.departure_at) < new Date(dateFrom)) return false
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        if (new Date(pass.departure_at) > end) return false
      }

      if (statusFilter === 'overdue') {
        const overdue =
          pass.is_overdue
          || (['approved', 'extended'].includes(pass.status)
            && !entry_at
            && new Date(pass.return_by) < new Date())
        if (!overdue) return false
      } else if (statusFilter === 'completed') {
        if (!entry_at && pass.status !== 'cancelled') return false
      } else if (statusFilter !== 'all' && pass.status !== statusFilter) {
        return false
      }

      if (!q) return true
      return student_name.toLowerCase().includes(q) || reg_number.toLowerCase().includes(q)
    })
  }, [rows, debouncedSearch, statusFilter, typeFilter, dateFrom, dateTo])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, typeFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function overridePassStatus(passId: string, status: OutpassStatus, note: string) {
    const { error: updateError } = await supabase
      .from('outpass_requests')
      .update({
        status,
        admin_override_note: note.trim() || null,
      })
      .eq('id', passId)

    if (updateError) throw new Error(updateError.message)
    await fetchData()
  }

  return {
    rows: pageRows,
    total: filtered.length,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    setPage,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    overridePassStatus,
    refetch: fetchData,
  }
}
