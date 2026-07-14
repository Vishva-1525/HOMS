import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import { formatNetworkError } from '@/lib/network-error'
import { isPassActive } from '@/lib/outpass'
import { getCurrentSemesterRange, isWithinSemester } from '@/lib/semester'
import { fetchStudentRecord } from '@/lib/student-data'
import { supabase } from '@/lib/supabase'
import type { GateLog, OutpassRequest, Student } from '@/lib/types'

export interface SemesterStats {
  total: number
  approved: number
  pending: number
  rejected: number
}

export interface ActiveCheckedOutPass extends OutpassRequest {
  isCheckedOut: true
}

interface DashboardData {
  student: Student | null
  semesterPasses: OutpassRequest[]
  recentPasses: OutpassRequest[]
  activeCheckedOutPass: ActiveCheckedOutPass | null
  activePass: OutpassRequest | null
  stats: SemesterStats
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function computeSemesterStats(passes: OutpassRequest[]): SemesterStats {
  return {
    total: passes.length,
    approved: passes.filter((p) => p.status === 'approved' || p.status === 'extended').length,
    pending: passes.filter((p) => p.status === 'pending').length,
    rejected: passes.filter((p) => p.status === 'rejected').length,
  }
}

export function findCheckedOutPass(
  passes: OutpassRequest[],
  gateLogs: GateLog[],
): ActiveCheckedOutPass | null {
  const activePasses = passes.filter(isPassActive)

  for (const pass of activePasses) {
    const passLogs = gateLogs
      .filter((log) => log.outpass_id === pass.id)
      .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())

    if (passLogs.length > 0 && passLogs[0].event_type === 'exit') {
      return { ...pass, isCheckedOut: true }
    }
  }

  return null
}

export function useStudentDashboardData(): DashboardData {
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [passes, setPasses] = useState<OutpassRequest[]>([])
  const [gateLogs, setGateLogs] = useState<GateLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return

    setError(null)

    try {
      const [studentResult, passesResult] = await Promise.all([
        fetchStudentRecord(user.id),
        supabase
          .from('outpass_requests')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      if (studentResult.error) {
        setError(formatNetworkError(studentResult.error))
        setLoading(false)
        return
      }

      if (passesResult.error) {
        setError(formatNetworkError(passesResult.error.message))
        setLoading(false)
        return
      }

      const allPasses = (passesResult.data ?? []) as OutpassRequest[]
      setStudent(studentResult.student)
      setPasses(allPasses)

      const activePassIds = allPasses.filter(isPassActive).map((p) => p.id)

      if (activePassIds.length > 0) {
        const { data: logs, error: logsError } = await supabase
          .from('gate_logs')
          .select('*')
          .in('outpass_id', activePassIds)
          .order('scanned_at', { ascending: false })

        if (logsError) {
          // Soft-fail — dashboard still usable without gate status
          console.warn('gate_logs fetch soft-failed:', logsError.message)
          setGateLogs([])
        } else {
          setGateLogs((logs ?? []) as GateLog[])
        }
      } else {
        setGateLogs([])
      }
    } catch (err) {
      setError(formatNetworkError(err, 'Failed to load dashboard.'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    void fetchData()
  }, [user, fetchData])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`student-dashboard-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outpass_requests',
          filter: `student_id=eq.${user.id}`,
        },
        () => {
          void fetchData()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gate_logs',
        },
        () => {
          void fetchData()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user, fetchData])

  const semesterPasses = useMemo(
    () => passes.filter((p) => isWithinSemester(p.created_at)),
    [passes],
  )

  const recentPasses = useMemo(() => passes.slice(0, 5), [passes])

  const activePass = useMemo(() => passes.find(isPassActive) ?? null, [passes])

  const stats = useMemo(() => computeSemesterStats(semesterPasses), [semesterPasses])

  const activeCheckedOutPass = useMemo(
    () => findCheckedOutPass(passes, gateLogs),
    [passes, gateLogs],
  )

  return {
    student,
    semesterPasses,
    recentPasses,
    activeCheckedOutPass,
    activePass,
    stats,
    loading,
    error,
    refetch: fetchData,
  }
}

export function getSemesterLabel(): string {
  const { start } = getCurrentSemesterRange()
  return start.getMonth() >= 6 ? 'Sem 1' : 'Sem 2'
}
