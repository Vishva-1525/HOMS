import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReportFilters, ReportRow } from '@/lib/report-types'
import { computeReportStatsFromRows } from '@/lib/report-types'
import { cachedQuery } from '@/lib/query-cache'
import { supabase } from '@/lib/supabase'

const EXPORT_LIMIT = 10_000
/** Screen table stays lean; export uses full EXPORT_LIMIT. */
const VIEW_LIMIT = 250
const DISTINCT_TTL_MS = 5 * 60_000

async function fetchReportRows(
  filters: ReportFilters,
  limit: number,
  gender?: 'male' | 'female' | null,
): Promise<ReportRow[]> {
  const { data, error } = await supabase.rpc('get_outpass_report', {
    p_start: filters.start.toISOString(),
    p_end: filters.end.toISOString(),
    p_hostel_block: filters.hostelBlock ?? null,
    p_department: filters.department ?? null,
    p_limit: limit,
    p_gender: gender ?? null,
  })

  if (error) throw new Error(error.message)
  return (data as ReportRow[]) ?? []
}

export function useReportData(
  filters: ReportFilters | null,
  fixedGender?: 'male' | 'female' | null,
) {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!filters) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReportRows(filters, VIEW_LIMIT, fixedGender)
      setRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [filters, fixedGender])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const stats = useMemo(() => computeReportStatsFromRows(rows), [rows])

  const fetchAllForExport = useCallback(async (): Promise<ReportRow[]> => {
    if (!filters) return []
    return fetchReportRows(filters, EXPORT_LIMIT, fixedGender)
  }, [filters, fixedGender])

  return {
    rows,
    stats,
    loading,
    error,
    refetch: fetchData,
    fetchAllForExport,
    viewLimit: VIEW_LIMIT,
  }
}

export async function fetchWardenBlockAssignment(userId: string): Promise<string | null> {
  const assignment = await fetchWardenAssignment(userId)
  return assignment?.block ?? null
}

export async function fetchWardenAssignment(
  userId: string,
): Promise<{ block: string; gender: 'male' | 'female' | null } | null> {
  const [{ data: assignment }, { data: profile }] = await Promise.all([
    supabase
      .from('staff_assignments')
      .select('assignment_value')
      .eq('profile_id', userId)
      .eq('assignment_type', 'block')
      .maybeSingle(),
    supabase.from('profiles').select('gender').eq('id', userId).maybeSingle(),
  ])

  const block = assignment?.assignment_value?.trim()
  if (!block) return null

  const gender = profile?.gender === 'female' ? 'female' : profile?.gender === 'male' ? 'male' : null
  return { block, gender }
}

export async function fetchDistinctBlocks(): Promise<string[]> {
  return cachedQuery('distinct:hostel_block', DISTINCT_TTL_MS, async () => {
    const { data } = await supabase.from('students').select('hostel_block')
    const blocks = [...new Set((data ?? []).map((r) => r.hostel_block).filter(Boolean))]
    return blocks.sort()
  })
}

export async function fetchDistinctDepartments(): Promise<string[]> {
  return cachedQuery('distinct:department', DISTINCT_TTL_MS, async () => {
    const { data } = await supabase.from('students').select('department')
    const depts = [...new Set((data ?? []).map((r) => r.department).filter(Boolean))]
    return depts.sort()
  })
}
