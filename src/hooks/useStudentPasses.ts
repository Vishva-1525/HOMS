import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { ExtensionRequest, GateLog, OutpassRequest, Student } from '@/lib/types'

interface StudentPassesData {
  passes: OutpassRequest[]
  gateLogs: GateLog[]
  extensions: ExtensionRequest[]
  student: Student | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStudentPasses(): StudentPassesData {
  const { user } = useAuth()
  const [passes, setPasses] = useState<OutpassRequest[]>([])
  const [gateLogs, setGateLogs] = useState<GateLog[]>([])
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([])
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return

    setError(null)

    const [studentResult, passesResult] = await Promise.all([
      supabase.from('students').select('*').eq('id', user.id).single(),
      supabase
        .from('outpass_requests')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    if (studentResult.error) {
      setError(studentResult.error.message)
      setLoading(false)
      return
    }

    if (passesResult.error) {
      setError(passesResult.error.message)
      setLoading(false)
      return
    }

    const allPasses = (passesResult.data ?? []) as OutpassRequest[]
    setStudent(studentResult.data as Student)
    setPasses(allPasses)

    const passIds = allPasses.map((p) => p.id)

    if (passIds.length > 0) {
      const [logsResult, extensionsResult] = await Promise.all([
        supabase.from('gate_logs').select('*').in('outpass_id', passIds),
        supabase.from('extension_requests').select('*').in('outpass_id', passIds),
      ])

      if (logsResult.error) {
        setError(logsResult.error.message)
      } else {
        setGateLogs((logsResult.data ?? []) as GateLog[])
      }

      if (extensionsResult.error) {
        setError(extensionsResult.error.message)
      } else {
        setExtensions((extensionsResult.data ?? []) as ExtensionRequest[])
      }
    } else {
      setGateLogs([])
      setExtensions([])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`student-passes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outpass_requests',
          filter: `student_id=eq.${user.id}`,
        },
        () => fetchData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () =>
        fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'extension_requests' },
        () => fetchData(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchData])

  return { passes, gateLogs, extensions, student, loading, error, refetch: fetchData }
}
