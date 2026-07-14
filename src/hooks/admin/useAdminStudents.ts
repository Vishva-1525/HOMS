import { useCallback, useEffect, useState } from 'react'
import type { AdminStudentRow } from '@/lib/admin-types'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatNetworkError } from '@/lib/network-error'
import {
  cachedQuery,
  invalidateCachedQuery,
  peekCachedQuery,
  setCachedQuery,
} from '@/lib/query-cache'
import { supabase } from '@/lib/supabase'
import type { OutpassRequest } from '@/lib/types'

const PAGE_SIZE = 25
const FILTER_TTL_MS = 60_000
const PAGE_TTL_MS = 30_000

type CampusStatus = AdminStudentRow['campus_status']

interface CampusStatusRow {
  student_id: string
  full_name: string
  current_status: CampusStatus
}

interface StudentQueryRow {
  id: string
  reg_number: string
  room_number: string
  hostel_block: string
  department: string
  year_of_study: number | null
  parent_phone: string | null
  parent_email: string | null
  is_active: boolean | null
}

interface ProfileRow {
  id: string
  full_name: string | null
  phone: string | null
}

interface FilterOptionsPayload {
  blocks: string[]
  departments: string[]
  summary: { active: number; outside: number; overdue: number }
}

interface PagePayload {
  students: AdminStudentRow[]
  totalCount: number
}

function toCampusStatus(value: string | null | undefined): CampusStatus {
  if (value === 'outside' || value === 'overdue' || value === 'inside') return value
  return 'inside'
}

function normalizeYear(value: number | null | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function pageCacheKey(
  page: number,
  search: string,
  block: string,
  department: string,
  year: number | 'all',
) {
  return `admin-students:page:${page}:${search}:${block}:${department}:${year}`
}

async function loadFilterOptions(): Promise<FilterOptionsPayload> {
  const { data, error } = await supabase.rpc('get_student_filter_options')
  if (!error && data && typeof data === 'object') {
    const row = data as Record<string, unknown>
    return {
      blocks: Array.isArray(row.blocks) ? (row.blocks as string[]) : [],
      departments: Array.isArray(row.departments) ? (row.departments as string[]) : [],
      summary: {
        active: Number(row.active_count) || 0,
        outside: Number(row.outside_count) || 0,
        overdue: Number(row.overdue_count) || 0,
      },
    }
  }

  // Fallback if RPC not deployed yet — still bounded.
  const [blocksResult, deptsResult, activeResult, outsideResult, overdueResult] =
    await Promise.all([
      supabase.from('students').select('hostel_block').eq('is_active', true).limit(500),
      supabase.from('students').select('department').eq('is_active', true).limit(500),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase
        .from('student_campus_status')
        .select('student_id', { count: 'exact', head: true })
        .eq('current_status', 'outside'),
      supabase
        .from('student_campus_status')
        .select('student_id', { count: 'exact', head: true })
        .eq('current_status', 'overdue'),
    ])

  return {
    blocks: [...new Set((blocksResult.data ?? []).map((r) => r.hostel_block).filter(Boolean))].sort(),
    departments: [
      ...new Set((deptsResult.data ?? []).map((r) => r.department).filter(Boolean)),
    ].sort(),
    summary: {
      active: activeResult.count ?? 0,
      outside: outsideResult.count ?? 0,
      overdue: overdueResult.count ?? 0,
    },
  }
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
    const payload = await cachedQuery('admin-students:filters', FILTER_TTL_MS, loadFilterOptions)
    setBlocks(payload.blocks)
    setDepartments(payload.departments)
    setSummary(payload.summary)
  }, [])

  const fetchData = useCallback(async (opts?: { force?: boolean }) => {
    const cacheKey = pageCacheKey(
      page,
      debouncedSearch.trim(),
      blockFilter,
      departmentFilter,
      yearFilter,
    )

    if (!opts?.force) {
      const stale = peekCachedQuery<PagePayload>(cacheKey)
      if (stale) {
        setStudents(stale.students)
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
      const q = debouncedSearch.trim()

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
          is_active
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
        if (!peekCachedQuery(cacheKey)) {
          setStudents([])
          setTotalCount(0)
        }
        return
      }

      const pageRows = (data ?? []) as StudentQueryRow[]
      const ids = pageRows.map((r) => r.id).filter(Boolean)

      const statusById = new Map<string, CampusStatus>()
      const nameById = new Map<string, string>()
      const profileById = new Map<string, ProfileRow>()

      if (ids.length > 0) {
        const [statusResult, profileResult] = await Promise.all([
          supabase
            .from('student_campus_status')
            .select('student_id, full_name, current_status')
            .in('student_id', ids),
          supabase.from('profiles').select('id, full_name, phone').in('id', ids),
        ])

        if (!statusResult.error) {
          for (const row of (statusResult.data ?? []) as CampusStatusRow[]) {
            statusById.set(row.student_id, toCampusStatus(row.current_status))
            if (row.full_name?.trim()) nameById.set(row.student_id, row.full_name.trim())
          }
        }

        if (!profileResult.error) {
          for (const row of (profileResult.data ?? []) as ProfileRow[]) {
            profileById.set(row.id, row)
            if (row.full_name?.trim() && !nameById.has(row.id)) {
              nameById.set(row.id, row.full_name.trim())
            }
          }
        }
      }

      const mapped: AdminStudentRow[] = pageRows.map((row) => {
        const profile = profileById.get(row.id) ?? null
        const fullName = nameById.get(row.id) ?? profile?.full_name?.trim() ?? ''
        return {
          id: row.id,
          reg_number: row.reg_number ?? '',
          room_number: row.room_number ?? '',
          hostel_block: row.hostel_block ?? '',
          department: row.department ?? '',
          year_of_study: normalizeYear(row.year_of_study),
          parent_phone: row.parent_phone ?? '',
          parent_email: row.parent_email ?? '',
          is_active: row.is_active ?? true,
          full_name: fullName,
          profiles: {
            full_name: fullName,
            phone: profile?.phone ?? '',
          },
          campus_status: statusById.get(row.id) ?? 'inside',
        }
      })

      const payload: PagePayload = {
        students: mapped,
        totalCount: count ?? mapped.length,
      }
      setCachedQuery(cacheKey, payload, PAGE_TTL_MS)
      setStudents(mapped)
      setTotalCount(payload.totalCount)
    } catch (err) {
      setError(formatNetworkError(err, 'Failed to load students.'))
      if (!peekCachedQuery(cacheKey)) {
        setStudents([])
        setTotalCount(0)
      }
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
    invalidateCachedQuery('admin-students:')
    await Promise.all([fetchData({ force: true }), fetchFilterOptions()])
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
    invalidateCachedQuery('admin-students:')
    await Promise.all([fetchData({ force: true }), fetchFilterOptions()])
  }

  const getStudentPasses = useCallback(async (studentId: string): Promise<OutpassRequest[]> => {
    const { data, error: fetchError } = await supabase
      .from('outpass_requests')
      .select(
        'id, student_id, pass_type, destination, reason, departure_at, return_by, status, created_at, is_overdue, approved_by, warden_remark, admin_override_note',
      )
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
    isLoading: loading,
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
      invalidateCachedQuery('admin-students:')
      await Promise.all([fetchData({ force: true }), fetchFilterOptions()])
    },
  }
}
