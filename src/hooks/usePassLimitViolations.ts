import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface PassLimitViolation {
  student_id: string
  reg_number: string
  student_name: string
  hostel_block: string
  weekly_used: number
  weekly_limit: number
  monthly_used: number
  monthly_limit: number
  weekly_exceeded: boolean
  monthly_exceeded: boolean
}

export function usePassLimitViolations() {
  const [violations, setViolations] = useState<PassLimitViolation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchViolations = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc('get_pass_limit_violations')

    if (rpcError) {
      setError(rpcError.message)
      setViolations([])
    } else {
      setViolations((data ?? []) as PassLimitViolation[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchViolations()
  }, [fetchViolations])

  const violationByStudentId = useCallback(
    (studentId: string) => violations.find((v) => v.student_id === studentId) ?? null,
    [violations],
  )

  return { violations, loading, error, violationByStudentId, refetch: fetchViolations }
}
