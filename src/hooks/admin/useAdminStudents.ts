import { useCallback, useEffect, useState } from 'react'
import type { AdminStudentRow } from '@/lib/admin-types'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatNetworkError } from '@/lib/network-error'
import { supabase } from '@/lib/supabase'
import type { OutpassRequest } from '@/lib/types'

const PAGE_SIZE = 25

type CampusStatus = AdminStudentRow['campus_status']

interface CampusStatusRow {
  student_id: string
  reg_number: string
  full_name: string
  hostel_block: string
  current_status: CampusStatus
}

interface StudentQueryRow {
  id: string
  reg_number: string
  room_number: string
  hostel_block: string
  department: string
  year_of_study: number
  parent_phone: string
  parent_email: string
  is_active: boolean | null
  profiles: { full_name: string; phone: string } | null
}

function toCampusStatus(value: string | null | undefined): CampusStatus {
  if (value === 'outside' || value === 'overdue' || value === 'inside') return value
  return 'inside'
}

export function useAdminStudents() {
  const [students, setStudents] = useState<AdminStudentRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [blockFilter, setBlockFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)

  const [blocks, setBlocks] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [summary, setSummary] = useState({ active: 0, outside: 0, overdue: 0 })

  const pageSize = PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const fetchFilterOptions = useCallback(async () => {
    const [blocksResult, deptsResult, activeResult, outsideResult, overdueResult] =
      await Promise.all([
        supabase.from('students').select('hostel_block'),
        supabase.from('students').select('department'),
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('student_campus_status')
          .select('student_id', { count: 'exact', head: true })
          .eq('current_status', 'outside'),
        supabase
          .from('student_campus_status')
          .select('student_id', { count: 'exact', head: true })
          .eq('current_status', 'overdue'),
      ])

    setBlocks(
      [...new Set((blocksResult.data ?? []).map((r) => r.hostel_block).filter(Boolean))].sort(),
    )
    setDepartments(
      [...new Set((deptsResult.data ?? []).map((r) => r.department).filter(Boolean))].sort(),
    )
    setSummary({
      active: activeResult.count ?? 0,
      outside: outsideResult.count ?? 0,
      overdue: overdueResult.count ?? 0,
    })
  }, [])

  const fetchData = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const q = debouncedSearch.trim()

      // Name search: resolve matching IDs from the campus status view first (bounded).
      let nameMatchedIds: string[] | null = null
      if (q && /[a-zA-Z\s]/.test(q)) {
        const { data: nameHits } = await supabase
          .from('student_campus_status')
          .select('student_id')
          .ilike('full_name', `%${q}%`)
          .limit(500)
        nameMatchedIds = ((nameHits ?? []) as { student_id: string }[]).map((r) => r.student_id)
      }

      let query = supabase
        .from('students')
        .select(
          `
          id,
          reg_number,
          room_number,
          hostel_block,
          department,
          year_of_study,
          parent_phone,
          parent_email,
          is_active,
          profiles ( full_name, phone )
        `,
          { count: 'exact' },
        )
        .order('reg_number', { ascending: true })
        .range(from, to)

      if (blockFilter !== 'all') query = query.eq('hostel_block', blockFilter)
      if (departmentFilter !== 'all') query = query.eq('department', departmentFilter)
      if (yearFilter !== 'all') query = query.eq('year_of_study', yearFilter)

      if (q) {
        if (nameMatchedIds && nameMatchedIds.length > 0) {
          query = query.or(
            `reg_number.ilike.%${q}%,parent_phone.ilike.%${q}%,id.in.(${nameMatchedIds.join(',')})`,
          )
        } else {
          query = query.or(`reg_number.ilike.%${q}%,parent_phone.ilike.%${q}%`)
        }
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) {
        setError(formatNetworkError(fetchError.message))
        setStudents([])
        setTotalCount(0)
        return
      }

      const pageRows = (data ?? []).map((row) => {
        const raw = row as StudentQueryRow & {
          profiles: StudentQueryRow['profiles'] | StudentQueryRow['profiles'][]
        }
        const profiles = Array.isArray(raw.profiles) ? (raw.profiles[0] ?? null) : raw.profiles
        return { ...raw, profiles }
      }) as StudentQueryRow[]
      const ids = pageRows.map((r) => r.id)

      const statusById = new Map<string, CampusStatus>()
      if (ids.length > 0) {
        const { data: statusRows, error: statusError } = await supabase
          .from('student_campus_status')
          .select('student_id, current_status')
          .in('student_id', ids)

        if (statusError) {
          console.warn('student_campus_status soft-failed:', statusError.message)
        } else {
          for (const row of (statusRows ?? []) as Pick<CampusStatusRow, 'student_id' | 'current_status'>[]) {
            statusById.set(row.student_id, toCampusStatus(row.current_status))
          }
        }
      }

      setStudents(
        pageRows.map((row) => ({
          id: row.id,
          reg_number: row.reg_number,
          room_number: row.room_number,
          hostel_block: row.hostel_block,
          department: row.department,
          year_of_study: row.year_of_study,
          parent_phone: row.parent_phone,
          parent_email: row.parent_email,
          is_active: row.is_active ?? true,
          profiles: row.profiles,
          campus_status: statusById.get(row.id) ?? 'inside',
        })),
      )
      setTotalCount(count ?? pageRows.length)
    } catch (err) {
      setError(formatNetworkError(err, 'Failed to load students.'))
      setStudents([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, blockFilter, departmentFilter, yearFilter])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, blockFilter, departmentFilter, yearFilter])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    void fetchFilterOptions()
  }, [fetchFilterOptions])

  async function deactivateStudent(studentId: string) {
    const { error: updateError } = await supabase
      .from('students')
      .update({ is_active: false })
      .eq('id', studentId)
    if (updateError) throw new Error(updateError.message)
    await Promise.all([fetchData(), fetchFilterOptions()])
  }

  async function updateStudent(
    studentId: string,
    patch: Partial<AdminStudentRow> & { full_name?: string; phone?: string },
  ) {
    const { full_name, phone, ...studentPatch } = patch
    if (full_name !== undefined || phone !== undefined) {
      await supabase
        .from('profiles')
        .update({
          ...(full_name !== undefined ? { full_name } : {}),
          ...(phone !== undefined ? { phone } : {}),
        })
        .eq('id', studentId)
    }
    if (Object.keys(studentPatch).length > 0) {
      const { error: updateError } = await supabase
        .from('students')
        .update(studentPatch)
        .eq('id', studentId)
      if (updateError) throw new Error(updateError.message)
    }
    await Promise.all([fetchData(), fetchFilterOptions()])
  }

  /** Bounded: only this student's recent passes for the detail drawer. */
  const getStudentPasses = useCallback(async (studentId: string): Promise<OutpassRequest[]> => {
    const { data, error: fetchError } = await supabase
      .from('outpass_requests')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchError) throw new Error(fetchError.message)
    return (data ?? []) as OutpassRequest[]
  }, [])

  return {
    students,
    data: students,
    totalCount,
    total: totalCount,
    page,
    pageSize,
    totalPages,
    setPage,
    blocks,
    departments,
    summary,
    loading,
    error,
    search,
    setSearch,
    blockFilter,
    setBlockFilter,
    departmentFilter,
    setDepartmentFilter,
    yearFilter,
    setYearFilter,
    deactivateStudent,
    updateStudent,
    getStudentPasses,
    allStudents: students,
    refetch: async () => {
      await Promise.all([fetchData(), fetchFilterOptions()])
    },
  }
}
