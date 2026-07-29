import { useEffect, useState } from 'react'
import {
  DEFAULT_PASS_LIMITS,
  parsePassLimitsFromSettings,
  type PassValidationLimits,
} from '@/lib/pass-limits'
import { supabase } from '@/lib/supabase'

export function useStudentPassLimits(): PassValidationLimits {
  const [limits, setLimits] = useState<PassValidationLimits>(DEFAULT_PASS_LIMITS)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const { data } = await supabase.rpc('get_student_pass_limits')
      if (cancelled) return
      setLimits(parsePassLimitsFromSettings(data as Record<string, string> | null))
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return limits
}
