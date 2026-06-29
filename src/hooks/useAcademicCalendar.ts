import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildCalendarMap, toDateKey } from '@/lib/academic-calendar'
import { supabase } from '@/lib/supabase'
import type { AcademicCalendarDay } from '@/lib/types'

function defaultRange(): { start: string; end: string } {
  const start = new Date()
  start.setDate(start.getDate() - 30)
  const end = new Date()
  end.setDate(end.getDate() + 150)
  return { start: toDateKey(start), end: toDateKey(end) }
}

export function useAcademicCalendar(month?: Date) {
  const [days, setDays] = useState<AcademicCalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendar = useCallback(async () => {
    setLoading(true)
    setError(null)

    const range = month
      ? {
          start: toDateKey(new Date(month.getFullYear(), month.getMonth(), 1)),
          end: toDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0)),
        }
      : defaultRange()

    const { data, error: rpcError } = await supabase.rpc('get_academic_calendar', {
      p_start: range.start,
      p_end: range.end,
    })

    if (rpcError) {
      setError(rpcError.message)
      setDays([])
    } else {
      setDays((data ?? []) as AcademicCalendarDay[])
    }

    setLoading(false)
  }, [month])

  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar])

  const calendarMap = useMemo(() => buildCalendarMap(days), [days])

  return { days, calendarMap, loading, error, refetch: fetchCalendar }
}
