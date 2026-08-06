import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useWardenScope } from '@/hooks/warden/useWardenScope'
import { formatNetworkError } from '@/lib/network-error'
import { normalizeHostelBlock } from '@/lib/block-display'
import { supabase } from '@/lib/supabase'

export interface WardenBlockStudent {
  id: string
  full_name: string
  reg_number: string
  room_number: string
  hostel_block: string
  department: string
  year_of_study: number
  parent_phone: string
  campus_status: 'inside' | 'outside' | 'overdue'
  avatar_url: string | null
}

interface StudentRow {
  id: string
  reg_number: string
  room_number: string
  hostel_block: string
  department: string | null
  year_of_study: number | null
  parent_phone: string | null
  gender: string | null
}

function toCampusStatus(value: string | null | undefined): WardenBlockStudent['campus_status'] {
  if (value === 'outside' || value === 'overdue' || value === 'inside') return value
  return 'inside'
}

export function useWardenBlockStudents() {
  const { scope, loading: scopeLoading, error: scopeError } = useWardenScope()
  const [students, setStudents] = useState<WardenBlockStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)

  const blockLabel = useMemo(() => {
    if (!scope) return null
    if (scope.tier === 'rt') return scope.block
    if (scope.escalatedBlocks.length === 0) return null
    return scope.escalatedBlocks.join(', ')
  }, [scope])

  const fetchStudents = useCallback(async () => {
    if (scopeLoading) return

    if (!scope) {
      setStudents([])
      setLoading(false)
      setError(scopeError)
      return
    }

    const blocks =
      scope.tier === 'rt'
        ? scope.block
          ? [scope.block.trim()]
          : []
        : scope.escalatedBlocks.map((b) => b.trim()).filter(Boolean)

    if (blocks.length === 0) {
      setStudents([])
      setLoading(false)
      setError(
        scope.tier === 'superior'
          ? 'No blocks are escalated right now.'
          : 'No hostel block is assigned to your account.',
      )
      return
    }

    setLoading(true)
    setError(null)

    try {
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
          gender
        `,
        )
        .eq('is_active', true)
        .in('hostel_block', blocks)
        .order('reg_number', { ascending: true })

      if (scope.gender) {
        query = query.eq('gender', scope.gender)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw new Error(fetchError.message)

      let rows = (data ?? []) as StudentRow[]

      // Defensive filter if block strings differ only by formatting.
      const blockSet = new Set(blocks.map(normalizeHostelBlock))
      rows = rows.filter((row) => blockSet.has(normalizeHostelBlock(row.hostel_block)))
      const ids = rows.map((r) => r.id)

      const nameById = new Map<string, string>()
      const statusById = new Map<string, WardenBlockStudent['campus_status']>()
      const avatarById = new Map<string, string | null>()

      if (ids.length > 0) {
        const [statusResult, profileResult] = await Promise.all([
          supabase
            .from('student_campus_status')
            .select('student_id, full_name, current_status')
            .in('student_id', ids),
          supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids),
        ])

        for (const row of statusResult.data ?? []) {
          const r = row as {
            student_id: string
            full_name: string | null
            current_status: string | null
          }
          statusById.set(r.student_id, toCampusStatus(r.current_status))
          if (r.full_name?.trim()) nameById.set(r.student_id, r.full_name.trim())
        }

        for (const row of profileResult.data ?? []) {
          const r = row as { id: string; full_name: string | null; avatar_url: string | null }
          avatarById.set(r.id, r.avatar_url)
          if (r.full_name?.trim() && !nameById.has(r.id)) {
            nameById.set(r.id, r.full_name.trim())
          }
        }
      }

      setStudents(
        rows.map((row) => ({
          id: row.id,
          full_name: nameById.get(row.id) ?? row.reg_number,
          reg_number: row.reg_number ?? '',
          room_number: row.room_number ?? '',
          hostel_block: row.hostel_block ?? '',
          department: row.department ?? '',
          year_of_study: Number(row.year_of_study) || 0,
          parent_phone: row.parent_phone ?? '',
          campus_status: statusById.get(row.id) ?? 'inside',
          avatar_url: avatarById.get(row.id) ?? null,
        })),
      )
    } catch (err) {
      setStudents([])
      setError(formatNetworkError(err instanceof Error ? err.message : 'Failed to load students'))
    } finally {
      setLoading(false)
    }
  }, [scope, scopeLoading, scopeError])

  useEffect(() => {
    void fetchStudents()
  }, [fetchStudents])

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => {
      return (
        s.full_name.toLowerCase().includes(q)
        || s.reg_number.toLowerCase().includes(q)
        || s.room_number.toLowerCase().includes(q)
        || s.department.toLowerCase().includes(q)
        || s.parent_phone.toLowerCase().includes(q)
      )
    })
  }, [students, debouncedSearch])

  return {
    students: filtered,
    totalCount: students.length,
    blockLabel,
    scope,
    search,
    setSearch,
    loading: loading || scopeLoading,
    error,
    refetch: fetchStudents,
  }
}
