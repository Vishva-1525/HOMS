import { useCallback, useEffect, useState } from 'react'
import type { AcademicCalendarDay, AcademicDayType } from '@/lib/types'
import { supabase } from '@/lib/supabase'

export function useAdminCalendar() {
  const [days, setDays] = useState<AcademicCalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<AcademicDayType | 'all'>('all')

  const fetchDays = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('academic_calendar')
      .select('calendar_date, day_type, label')
      .order('calendar_date', { ascending: true })

    if (typeFilter !== 'all') {
      query = query.eq('day_type', typeFilter)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
      setDays([])
    } else {
      setDays((data ?? []) as AcademicCalendarDay[])
    }

    setLoading(false)
  }, [typeFilter])

  useEffect(() => {
    fetchDays()
  }, [fetchDays])

  async function upsertDay(day: AcademicCalendarDay) {
    const { error: upsertError } = await supabase.from('academic_calendar').upsert({
      calendar_date: day.calendar_date,
      day_type: day.day_type,
      label: day.label,
    })

    if (upsertError) throw new Error(upsertError.message)
    await fetchDays()
  }

  async function deleteDay(calendarDate: string) {
    const { error: deleteError } = await supabase
      .from('academic_calendar')
      .delete()
      .eq('calendar_date', calendarDate)

    if (deleteError) throw new Error(deleteError.message)
    await fetchDays()
  }

  return {
    days,
    loading,
    error,
    typeFilter,
    setTypeFilter,
    upsertDay,
    deleteDay,
    refetch: fetchDays,
  }
}
