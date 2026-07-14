import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import { fetchStudentRecord } from '@/lib/student-data'
import { supabase } from '@/lib/supabase'
import type { Student } from '@/lib/types'

export function useStudentProfile() {
  const { user, profile, changePassword } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudent = useCallback(async () => {
    if (!user) return

    setError(null)
    try {
      const { student: record, error: fetchError } = await fetchStudentRecord(user.id)

      if (fetchError) {
        setError(fetchError)
      } else {
        setStudent(record)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    setLoading(true)
    fetchStudent()
  }, [fetchStudent])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`student-profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students', filter: `id=eq.${user.id}` },
        () => fetchStudent(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => fetchStudent(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchStudent])

  return {
    student,
    profile,
    email: user?.email ?? null,
    loading,
    error,
    changePassword,
    refetch: fetchStudent,
  }
}
