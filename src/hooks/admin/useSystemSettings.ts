import { useCallback, useEffect, useState } from 'react'
import type { SystemSettingsMap } from '@/lib/admin-types'
import { invalidateQrAvailabilityCache } from '@/hooks/useQrAvailabilityMinutes'
import { formatNetworkError } from '@/lib/network-error'
import { supabase } from '@/lib/supabase'

const DEFAULT_KEYS = [
  'max_outpass_hours',
  'max_staypass_days',
  'max_special_pass_days',
  'max_internship_days',
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
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase.from('system_settings').select('key, value')

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      const map: SystemSettingsMap = {}
      for (const row of data ?? []) {
        map[row.key] = row.value
      }
      setSettings(map)
      setDraft(map)
    } catch (err) {
      setError(formatNetworkError(err, 'Failed to load settings.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  function updateDraft(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function saveSettings() {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const updates = DEFAULT_KEYS.map((key) => ({
        key,
        value: draft[key] ?? settings[key] ?? '',
      }))

      for (const { key, value } of updates) {
        const { error: updateError } = await supabase
          .from('system_settings')
          .upsert({ key, value }, { onConflict: 'key' })

        if (updateError) {
          throw new Error(updateError.message)
        }
      }

      setSettings({ ...draft })
      invalidateQrAvailabilityCache()
      setSaved(true)
      window.setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      const message = formatNetworkError(err, 'Failed to save settings.')
      setError(message)
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setSaving(false)
    }
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
