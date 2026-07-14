import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import { debounce } from '@/lib/debounce'
import { formatNetworkError } from '@/lib/network-error'
import { fetchStudentRecord } from '@/lib/student-data'
import { supabase } from '@/lib/supabase'
import type { ExtensionRequest, GateLog, OutpassRequest, Student, StudentPassQuotas } from '@/lib/types'

const DEFAULT_QUOTAS: StudentPassQuotas = {
  weekly_limit: 2,
  monthly_limit: 5,
  weekly_used: 0,
  monthly_used: 0,
  weekly_remaining: 2,
  monthly_remaining: 5,
  week_start: '',
  month_start: '',
}

const REALTIME_DEBOUNCE_MS = 600
const PASS_LIMIT = 150

export interface StudentDataValue {
  student: Student | null
  passes: OutpassRequest[]
  gateLogs: GateLog[]
  extensions: ExtensionRequest[]
  quotas: StudentPassQuotas
  /** True only until the first load attempt finishes. */
  loading: boolean
  /** True while a background refresh is in flight. */
  refreshing: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Shared student data loader — one request set for the whole student shell.
 * Stale-while-revalidate: navigating Home ↔ Passes keeps cached data on screen.
 */
export function useStudentData(): StudentDataValue {
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [passes, setPasses] = useState<OutpassRequest[]>([])
  const [gateLogs, setGateLogs] = useState<GateLog[]>([])
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([])
  const [quotas, setQuotas] = useState<StudentPassQuotas>(DEFAULT_QUOTAS)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasLoadedRef = useRef(false)
  const inFlightRef = useRef<Promise<void> | null>(null)
  const userIdRef = useRef<string | null>(null)
  const passIdsRef = useRef<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    const userId = userIdRef.current
    if (!userId) return

    if (inFlightRef.current) {
      await inFlightRef.current
      return
    }

    const run = (async () => {
      setError(null)
      if (hasLoadedRef.current) setRefreshing(true)

      try {
        const [studentResult, passesResult, quotasResult] = await Promise.all([
          fetchStudentRecord(userId),
          supabase
            .from('outpass_requests')
            .select(
              'id, student_id, pass_type, destination, reason, departure_at, return_by, status, warden_remark, approved_by, approved_at, is_overdue, qr_code_data, created_at, special_purpose, special_remarks, document_url, requires_hod_approval, entry_code',
            )
            .eq('student_id', userId)
            .order('created_at', { ascending: false })
            .limit(PASS_LIMIT),
          supabase.rpc('get_student_pass_quotas', { p_student_id: userId }),
        ])

        if (studentResult.error) {
          setError(formatNetworkError(studentResult.error))
          return
        }

        if (passesResult.error) {
          setError(formatNetworkError(passesResult.error.message))
          return
        }

        const allPasses = (passesResult.data ?? []) as OutpassRequest[]
        setStudent(studentResult.student)
        setPasses(allPasses)
        passIdsRef.current = new Set(allPasses.map((p) => p.id))

        if (quotasResult.error) {
          console.warn('pass quotas soft-failed:', quotasResult.error.message)
          setQuotas(DEFAULT_QUOTAS)
        } else {
          setQuotas({ ...DEFAULT_QUOTAS, ...(quotasResult.data as StudentPassQuotas) })
        }

        const passIds = allPasses.map((p) => p.id)
        if (passIds.length === 0) {
          setGateLogs([])
          setExtensions([])
          return
        }

        const [logsResult, extensionsResult] = await Promise.all([
          supabase
            .from('gate_logs')
            .select('id, outpass_id, scanned_by, event_type, scanned_at')
            .in('outpass_id', passIds),
          supabase
            .from('extension_requests')
            .select('id, outpass_id, new_return_time, reason, status, created_at')
            .in('outpass_id', passIds),
        ])

        if (!logsResult.error) {
          setGateLogs((logsResult.data ?? []) as GateLog[])
        } else {
          console.warn('gate_logs soft-failed:', logsResult.error.message)
        }

        if (!extensionsResult.error) {
          setExtensions((extensionsResult.data ?? []) as ExtensionRequest[])
        } else {
          console.warn('extension_requests soft-failed:', extensionsResult.error.message)
        }
      } catch (err) {
        setError(formatNetworkError(err, 'Failed to load student data.'))
      } finally {
        hasLoadedRef.current = true
        setHasLoaded(true)
        setRefreshing(false)
      }
    })()

    inFlightRef.current = run
    try {
      await run
    } finally {
      inFlightRef.current = null
    }
  }, [])

  useEffect(() => {
    userIdRef.current = user?.id ?? null

    if (!user) {
      hasLoadedRef.current = false
      setStudent(null)
      setPasses([])
      setGateLogs([])
      setExtensions([])
      setQuotas(DEFAULT_QUOTAS)
      setHasLoaded(false)
      setRefreshing(false)
      setError(null)
      passIdsRef.current = new Set()
      return
    }

    void fetchData()
  }, [user?.id, fetchData])

  useEffect(() => {
    if (!user) return

    const scheduleRefresh = debounce(() => {
      void fetchData()
    }, REALTIME_DEBOUNCE_MS)

    const channel = supabase
      .channel(`student-data-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outpass_requests',
          filter: `student_id=eq.${user.id}`,
        },
        () => scheduleRefresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gate_logs' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { outpass_id?: string } | null
          if (row?.outpass_id && !passIdsRef.current.has(row.outpass_id)) return
          scheduleRefresh()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'extension_requests' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { outpass_id?: string } | null
          if (row?.outpass_id && !passIdsRef.current.has(row.outpass_id)) return
          scheduleRefresh()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `id=eq.${user.id}`,
        },
        () => scheduleRefresh(),
      )
      .subscribe()

    return () => {
      scheduleRefresh.cancel()
      void supabase.removeChannel(channel)
    }
  }, [user?.id, fetchData])

  return useMemo(
    () => ({
      student,
      passes,
      gateLogs,
      extensions,
      quotas,
      loading: Boolean(user) && !hasLoaded,
      refreshing,
      error,
      refetch: fetchData,
    }),
    [student, passes, gateLogs, extensions, quotas, user, hasLoaded, refreshing, error, fetchData],
  )
}
