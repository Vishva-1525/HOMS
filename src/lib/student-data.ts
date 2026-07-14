import { formatNetworkError } from '@/lib/network-error'
import { supabase } from '@/lib/supabase'
import type { Student } from '@/lib/types'

export async function fetchStudentRecord(userId: string): Promise<{
  student: Student | null
  error: string | null
}> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      return { student: null, error: formatNetworkError(error.message) }
    }

    return { student: (data as Student | null) ?? null, error: null }
  } catch (err) {
    return { student: null, error: formatNetworkError(err, 'Failed to load student profile.') }
  }
}
