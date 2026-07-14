import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildCalendarMap, toDateKey } from '@/lib/academic-calendar'
import { formatNetworkError } from '@/lib/network-error'
import { supabase } from '@/lib/supabase'
import type { AcademicCalendarDay } from '@/lib/types'

type CacheEntry = {
  days: AcademicCalendarDay[]
  fetchedAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000
const calendarCache = new Map<string, CacheEntry>()

function defaultRange(): { start: string; end: string } {
  const start = new Date()
  start.setDate(start.getDate() - 30)
  const end = new Date()
  end.setDate(end.getDate() + 150)
  return { start: toDateKey(start), end: toDateKey(end) }
}

function rangeKey(start: string, end: string) {
  return `${start}:${end}`
}

export function useAcademicCalendar(month?: Date) {
  const [days, setDays] = useState<AcademicCalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const range = useMemo(() => {
    if (!month) return defaultRange()
    return {
      start: toDateKey(new Date(month.getFullYear(), month.getMonth(), 1)),
      end: toDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0)),
    }
  }, [month])

  const fetchCalendar = useCallback(async (force = false) => {
    const key = rangeKey(range.start, range.end)
    const cached = calendarCache.get(key)
    const now = Date.now()

    if (!force && cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      setDays(cached.days)
      setLoading(false)
      setError(null)
      return
    }

    // Show stale cache immediately while refreshing
    if (cached) {
      setDays(cached.days)
      setLoading(false)
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_academic_calendar', {
        p_start: range.start,
        p_end: range.end,
      })

      if (rpcError) {
        setError(formatNetworkError(rpcError.message))
        if (!cached) setDays([])
        return
      }

      const nextDays = (data ?? []) as AcademicCalendarDay[]
      calendarCache.set(key, { days: nextDays, fetchedAt: Date.now() })
      setDays(nextDays)
    } catch (err) {
      setError(formatNetworkError(err, 'Failed to load calendar.'))
      if (!cached) setDays([])
    } finally {
      setLoading(false)
    }
  }, [range.start, range.end])

  useEffect(() => {
    void fetchCalendar()
  }, [fetchCalendar])

  const calendarMap = useMemo(() => buildCalendarMap(days), [days])

  return {
    days,
    calendarMap,
    loading,
    error,
    refetch: () => fetchCalendar(true),
  }
}
