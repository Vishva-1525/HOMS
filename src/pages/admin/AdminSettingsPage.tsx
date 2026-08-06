import { useState } from 'react'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { AppDownloadCard } from '@/components/settings/AppDownloadCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthProvider'
import { useSystemSettings } from '@/hooks/admin/useSystemSettings'
import { verifyCurrentPassword } from '@/lib/auth'

const SETTING_LABELS: Record<string, { label: string; type?: 'boolean' }> = {
  max_outpass_hours: { label: 'Max outpass hours' },
  max_staypass_days: { label: 'Max stay pass days (0 = unlimited)' },
  max_special_pass_days: { label: 'Max special pass days (non-internship)' },
  max_internship_days: { label: 'Max internship QR days' },
  qr_availability_minutes: {
    label: 'QR availability window (minutes before departure)',
  },
  sms_notifications_enabled: { label: 'SMS notifications enabled', type: 'boolean' },
  email_notifications_enabled: { label: 'Email notifications enabled', type: 'boolean' },
  college_name: { label: 'College name' },
  hostel_name: { label: 'Hostel name' },
  supabase_functions_url: {
    label: 'Supabase Functions URL (for push/SMS dispatch)',
  },
}

export function AdminSettingsPage() {
  const { user } = useAuth()
  const { settings, loading, saving, error, saved, updateDraft, saveSettings } = useSystemSettings()
  const [currentPassword, setCurrentPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSave() {
    setFormError(null)

    const email = user?.email?.trim()
    if (!email) {
      setFormError('Your account email is missing. Sign out and sign in again.')
      return
    }
    if (!currentPassword.trim()) {
      setFormError('Enter your current password to save settings.')
      return
    }

    try {
      await verifyCurrentPassword(email, currentPassword)
      await saveSettings()
      setCurrentPassword('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save settings.')
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading settings…" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-page-header">
        <h1 className="dashboard-heading text-2xl md:text-3xl">Settings</h1>
      </div>

      {(error || formError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {formError ?? error}
        </div>
      )}

      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Settings saved successfully.
        </div>
      )}

      <AppDownloadCard />

      <div className="glass-panel-strong max-w-2xl space-y-5 p-6">
        {Object.entries(SETTING_LABELS).map(([key, meta]) => (
          <div key={key}>
            <Label htmlFor={key}>{meta.label}</Label>
            {meta.type === 'boolean' ? (
              <select
                id={key}
                value={settings[key] ?? 'false'}
                onChange={(e) => updateDraft(key, e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-sm"
                disabled={saving}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            ) : (
              <Input
                id={key}
                value={settings[key] ?? ''}
                onChange={(e) => updateDraft(key, e.target.value)}
                className="mt-1"
                disabled={saving}
              />
            )}
          </div>
        ))}

        <div>
          <Label htmlFor="settings-current-password">Current password</Label>
          <PasswordInput
            id="settings-current-password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={saving}
            required
            className="mt-1"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Required to save any settings changes.
          </p>
        </div>

        <Button type="button" onClick={() => void handleSave()} loading={saving}>
          Save settings
        </Button>
      </div>
    </div>
  )
}
