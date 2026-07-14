import { useCallback, useEffect, useMemo, useState } from 'react'
import { cachedQuery, invalidateCachedQuery } from '@/lib/query-cache'
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

const VIOLATIONS_TTL_MS = 60_000
const CACHE_KEY = 'rpc:get_pass_limit_violations'

export function usePassLimitViolations() {
  const [violations, setViolations] = useState<PassLimitViolation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchViolations = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)

    try {
      if (force) invalidateCachedQuery(CACHE_KEY)
      const data = await cachedQuery(CACHE_KEY, VIOLATIONS_TTL_MS, async () => {
        const { data: rows, error: rpcError } = await supabase.rpc('get_pass_limit_violations')
        if (rpcError) throw new Error(rpcError.message)
        return (rows ?? []) as PassLimitViolation[]
      })
      setViolations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load violations')
      setViolations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchViolations()
  }, [fetchViolations])

  const violationIndex = useMemo(() => {
    const map = new Map<string, PassLimitViolation>()
    for (const v of violations) map.set(v.student_id, v)
    return map
  }, [violations])

  const violationByStudentId = useCallback(
    (studentId: string) => violationIndex.get(studentId) ?? null,
    [violationIndex],
  )

  return {
    violations,
    loading,
    error,
    violationByStudentId,
    refetch: () => fetchViolations(true),
  }
}
