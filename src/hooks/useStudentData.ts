import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import { debounce } from '@/lib/debounce'
import { formatNetworkError } from '@/lib/network-error'
import { readSessionCache, writeSessionCache } from '@/lib/query-cache'
import { fetchStudentRecord } from '@/lib/student-data'
import { supabase } from '@/lib/supabase'
import type { ExtensionRequest, GateLog, OutpassRequest, Student } from '@/lib/types'

const REALTIME_DEBOUNCE_MS = 600
const PASS_LIMIT = 150
/** First paint: recent passes only; history fills in the background. */
const HOME_PASS_LIMIT = 25
const GATE_SOFT_POLL_MS = 45_000
const SESSION_CACHE_MAX_AGE_MS = 120_000

const PASS_COLUMNS =
  'id, student_id, pass_type, destination, reason, departure_at, return_by, status, warden_remark, approved_by, approved_at, is_overdue, qr_code_data, created_at, special_purpose, special_remarks, document_url, requires_hod_approval, entry_code, allows_multi_daily_scan'

interface StudentSnapshot {
  student: Student | null
  passes: OutpassRequest[]
  gateLogs: GateLog[]
  extensions: ExtensionRequest[]
}

export interface StudentDataValue {
  student: Student | null
  passes: OutpassRequest[]
  gateLogs: GateLog[]
  extensions: ExtensionRequest[]
  /** True only until the first load attempt finishes (or session cache paints). */
  loading: boolean
  /** True while a background refresh is in flight. */
  refreshing: boolean
  error: string | null
  refetch: () => Promise<void>
}

function sessionKey(userId: string) {
  return `student-home:${userId}`
}

/**
 * Shared student data loader - one request set for the whole student shell.
 * Stale-while-revalidate: navigating Home ↔ Passes keeps cached data on screen.
 */
export function useStudentData(): StudentDataValue {
  const { user } = useAuth()
  const cached = user ? readSessionCache<StudentSnapshot>(sessionKey(user.id), SESSION_CACHE_MAX_AGE_MS) : null
  const [student, setStudent] = useState<Student | null>(cached?.student ?? null)
  const [passes, setPasses] = useState<OutpassRequest[]>(cached?.passes ?? [])
  const [gateLogs, setGateLogs] = useState<GateLog[]>(cached?.gateLogs ?? [])
  const [extensions, setExtensions] = useState<ExtensionRequest[]>(cached?.extensions ?? [])
  const [hasLoaded, setHasLoaded] = useState(Boolean(cached))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasLoadedRef = useRef(Boolean(cached))
  const inFlightRef = useRef<Promise<void> | null>(null)
  const userIdRef = useRef<string | null>(null)
  const passIdsRef = useRef<Set<string>>(new Set(cached?.passes.map((p) => p.id) ?? []))

  const persistSnapshot = useCallback(
    (next: StudentSnapshot) => {
      const userId = userIdRef.current
      if (!userId) return
      writeSessionCache(sessionKey(userId), next)
    },
    [],
  )

  const fetchRelated = useCallback(async (passIds: string[]) => {
    if (passIds.length === 0) {
      setGateLogs([])
      setExtensions([])
      return { gateLogs: [] as GateLog[], extensions: [] as ExtensionRequest[] }
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

    const nextLogs = logsResult.error ? null : ((logsResult.data ?? []) as GateLog[])
    const nextExt = extensionsResult.error
      ? null
      : ((extensionsResult.data ?? []) as ExtensionRequest[])

    if (logsResult.error) console.warn('gate_logs soft-failed:', logsResult.error.message)
    if (extensionsResult.error) {
      console.warn('extension_requests soft-failed:', extensionsResult.error.message)
    }

    let resolvedLogs: GateLog[] = []
    let resolvedExt: ExtensionRequest[] = []

    if (nextLogs) {
      setGateLogs(nextLogs)
      resolvedLogs = nextLogs
    } else {
      setGateLogs((prev) => {
        resolvedLogs = prev
        return prev
      })
    }

    if (nextExt) {
      setExtensions(nextExt)
      resolvedExt = nextExt
    } else {
      setExtensions((prev) => {
        resolvedExt = prev
        return prev
      })
    }

    return { gateLogs: resolvedLogs, extensions: resolvedExt }
  }, [])

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
        const [studentResult, passesResult] = await Promise.all([
          fetchStudentRecord(userId),
          supabase
            .from('outpass_requests')
            .select(PASS_COLUMNS)
            .eq('student_id', userId)
            .order('created_at', { ascending: false })
            .limit(HOME_PASS_LIMIT),
        ])

        if (studentResult.error) {
          setError(formatNetworkError(studentResult.error))
          return
        }

        if (passesResult.error) {
          setError(formatNetworkError(passesResult.error.message))
          return
        }

        const firstPasses = (passesResult.data ?? []) as OutpassRequest[]
        setStudent(studentResult.student)
        setPasses(firstPasses)
        passIdsRef.current = new Set(firstPasses.map((p) => p.id))

        const related = await fetchRelated(firstPasses.map((p) => p.id))
        persistSnapshot({
          student: studentResult.student,
          passes: firstPasses,
          gateLogs: related.gateLogs,
          extensions: related.extensions,
        })

        // Background: fill remaining history for Passes page without blocking home.
        if (firstPasses.length >= HOME_PASS_LIMIT) {
          void (async () => {
            const { data, error: moreError } = await supabase
              .from('outpass_requests')
              .select(PASS_COLUMNS)
              .eq('student_id', userId)
              .order('created_at', { ascending: false })
              .range(HOME_PASS_LIMIT, PASS_LIMIT - 1)

            if (moreError || !data?.length) return
            const more = data as OutpassRequest[]
            setPasses((prev) => {
              const byId = new Map(prev.map((p) => [p.id, p]))
              for (const p of more) byId.set(p.id, p)
              const merged = [...byId.values()].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )
              passIdsRef.current = new Set(merged.map((p) => p.id))
              void fetchRelated(merged.map((p) => p.id)).then((rel) => {
                persistSnapshot({
                  student: studentResult.student,
                  passes: merged,
                  gateLogs: rel.gateLogs,
                  extensions: rel.extensions,
                })
              })
              return merged
            })
          })()
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
  }, [fetchRelated, persistSnapshot])

  useEffect(() => {
    userIdRef.current = user?.id ?? null

    if (!user) {
      hasLoadedRef.current = false
      setStudent(null)
      setPasses([])
      setGateLogs([])
      setExtensions([])
      setHasLoaded(false)
      setRefreshing(false)
      setError(null)
      passIdsRef.current = new Set()
      return
    }

    void fetchData()
  }, [user?.id, fetchData])

  // Live updates from filtered outpass + student row only (no campus-wide gate_logs fan-out).
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

  // Soft-poll gate/extension state while the student has an active pass.
  useEffect(() => {
    const hasActive = passes.some((p) => p.status === 'approved' || p.status === 'extended')
    if (!hasActive || passIdsRef.current.size === 0) return

    const tick = () => {
      void fetchRelated([...passIdsRef.current])
    }
    const id = window.setInterval(tick, GATE_SOFT_POLL_MS)
    return () => window.clearInterval(id)
  }, [passes, fetchRelated])

  return useMemo(
    () => ({
      student,
      passes,
      gateLogs,
      extensions,
      loading: Boolean(user) && !hasLoaded,
      refreshing,
      error,
      refetch: fetchData,
    }),
    [student, passes, gateLogs, extensions, user, hasLoaded, refreshing, error, fetchData],
  )
}
