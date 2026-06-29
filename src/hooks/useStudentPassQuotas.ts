import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { StudentPassQuotas } from '@/lib/types'

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

export function useStudentPassQuotas() {
  const { user } = useAuth()
  const [quotas, setQuotas] = useState<StudentPassQuotas>(DEFAULT_QUOTAS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotas = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc('get_student_pass_quotas', {
      p_student_id: user.id,
    })

    if (rpcError) {
      setError(rpcError.message)
      setQuotas(DEFAULT_QUOTAS)
    } else {
      setQuotas({ ...DEFAULT_QUOTAS, ...(data as StudentPassQuotas) })
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchQuotas()
  }, [fetchQuotas])

  return { quotas, loading, error, refetch: fetchQuotas }
}
