import { useCallback, useEffect, useState } from 'react'
import type { SystemSettingsMap } from '@/lib/admin-types'
import { invalidateQrAvailabilityCache } from '@/hooks/useQrAvailabilityMinutes'
import { supabase } from '@/lib/supabase'

const DEFAULT_KEYS = [
  'max_outpass_hours',
  'max_staypass_days',
  'max_night_pass_hours',
  'max_weekly_passes',
  'max_monthly_passes',
  'qr_availability_minutes',
  'sms_notifications_enabled',
  'email_notifications_enabled',
  'college_name',
  'hostel_name',
  'supabase_functions_url',
] as const

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettingsMap>({})
  const [draft, setDraft] = useState<SystemSettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const fetchSettings = useCallback(async () => {
    setError(null)
    const { data, error: fetchError } = await supabase.from('system_settings').select('key, value')

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const map: SystemSettingsMap = {}
    for (const row of data ?? []) {
      map[row.key] = row.value
    }
    setSettings(map)
    setDraft(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  function updateDraft(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function saveSettings() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const updates = DEFAULT_KEYS.map((key) => ({
      key,
      value: draft[key] ?? settings[key] ?? '',
    }))

    for (const { key, value } of updates) {
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({ value })
        .eq('key', key)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
    }

    setSettings({ ...draft })
    invalidateQrAvailabilityCache()
    setSaving(false)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 4000)
  }

  return {
    settings: draft,
    loading,
    saving,
    error,
    saved,
    updateDraft,
    saveSettings,
    refetch: fetchSettings,
  }
}
