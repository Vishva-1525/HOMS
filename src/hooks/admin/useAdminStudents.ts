import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdminStudentRow } from '@/lib/admin-types'
import { isPassOverdue } from '@/lib/pass-filters'
import { isStudentCurrentlyOut } from '@/lib/warden'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { supabase } from '@/lib/supabase'
import type { GateLog, OutpassRequest } from '@/lib/types'

function computeCampusStatus(
  studentId: string,
  passes: OutpassRequest[],
  gateLogs: GateLog[],
): AdminStudentRow['campus_status'] {
  const active = passes.filter(
    (p) =>
      p.student_id === studentId
      && (p.status === 'approved' || p.status === 'extended'),
  )

  for (const pass of active) {
    if (isPassOverdue(pass, gateLogs)) return 'overdue'
  }

  if (active.some((pass) => isStudentCurrentlyOut(pass, gateLogs))) return 'outside'
  return 'inside'
}

export function useAdminStudents() {
  const [students, setStudents] = useState<AdminStudentRow[]>([])
  const [passes, setPasses] = useState<OutpassRequest[]>([])
  const [gateLogs, setGateLogs] = useState<GateLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [blockFilter, setBlockFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const debouncedSearch = useDebouncedValue(search, 300)

  const fetchData = useCallback(async () => {
    setError(null)

    const [studentsResult, passesResult] = await Promise.all([
      supabase
        .from('students')
        .select('*, profiles(full_name, phone)')
        .order('reg_number'),
      supabase.from('outpass_requests').select('*'),
    ])

    if (studentsResult.error) {
      setError(studentsResult.error.message)
      setLoading(false)
      return
    }

    const allPasses = (passesResult.data ?? []) as OutpassRequest[]
    setPasses(allPasses)

    const passIds = allPasses.map((p) => p.id)
    let logs: GateLog[] = []
    if (passIds.length > 0) {
      const { data: logsData } = await supabase.from('gate_logs').select('*').in('outpass_id', passIds)
      logs = (logsData ?? []) as GateLog[]
    }
    setGateLogs(logs)

    const rows: AdminStudentRow[] = (studentsResult.data ?? []).map((s) => ({
      id: s.id,
      reg_number: s.reg_number,
      room_number: s.room_number,
      hostel_block: s.hostel_block,
      department: s.department,
      year_of_study: s.year_of_study,
      parent_phone: s.parent_phone,
      parent_email: s.parent_email,
      is_active: s.is_active ?? true,
      profiles: s.profiles as AdminStudentRow['profiles'],
      campus_status: computeCampusStatus(s.id, allPasses, logs),
    }))

    setStudents(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  const blocks = useMemo(
    () => [...new Set(students.map((s) => s.hostel_block).filter(Boolean))].sort(),
    [students],
  )

  const departments = useMemo(
    () => [...new Set(students.map((s) => s.department).filter(Boolean))].sort(),
    [students],
  )

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return students.filter((s) => {
      if (blockFilter !== 'all' && s.hostel_block !== blockFilter) return false
      if (departmentFilter !== 'all' && s.department !== departmentFilter) return false
      if (yearFilter !== 'all' && s.year_of_study !== yearFilter) return false
      if (!q) return true
      const name = s.profiles?.full_name?.toLowerCase() ?? ''
      return name.includes(q) || s.reg_number.toLowerCase().includes(q)
    })
  }, [students, debouncedSearch, blockFilter, departmentFilter, yearFilter])

  const summary = useMemo(() => {
    const active = students.filter((s) => s.is_active).length
    const outside = students.filter((s) => s.campus_status === 'outside').length
    const overdue = students.filter((s) => s.campus_status === 'overdue').length
    return { active, outside, overdue }
  }, [students])

  async function deactivateStudent(studentId: string) {
    const { error: updateError } = await supabase
      .from('students')
      .update({ is_active: false })
      .eq('id', studentId)
    if (updateError) throw new Error(updateError.message)
    await fetchData()
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
      const { error } = await supabase.from('students').update(studentPatch).eq('id', studentId)
      if (error) throw new Error(error.message)
    }
    await fetchData()
  }

  function getStudentPasses(studentId: string) {
    return passes.filter((p) => p.student_id === studentId)
  }

  return {
    students: filtered,
    allStudents: students,
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
    gateLogs,
    refetch: fetchData,
  }
}
