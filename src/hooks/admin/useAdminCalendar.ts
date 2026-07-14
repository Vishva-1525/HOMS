import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildCalendarMap } from '@/lib/academic-calendar'
import type { AcademicCalendarDay, AcademicDayType } from '@/lib/types'
import { supabase } from '@/lib/supabase'

export function useAdminCalendar() {
  const [allDays, setAllDays] = useState<AcademicCalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<AcademicDayType | 'all'>('all')

  const fetchDays = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('academic_calendar')
      .select('calendar_date, day_type, label')
      .order('calendar_date', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setAllDays([])
    } else {
      setAllDays((data ?? []) as AcademicCalendarDay[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchDays()
  }, [fetchDays])

  const days = useMemo(
    () =>
      typeFilter === 'all' ? allDays : allDays.filter((day) => day.day_type === typeFilter),
    [allDays, typeFilter],
  )

  const calendarMap = useMemo(() => buildCalendarMap(allDays), [allDays])

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
    allDays,
    calendarMap,
    loading,
    error,
    typeFilter,
    setTypeFilter,
    upsertDay,
    deleteDay,
    refetch: fetchDays,
  }
}
