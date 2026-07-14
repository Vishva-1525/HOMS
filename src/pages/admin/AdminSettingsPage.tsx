import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useSystemSettings } from '@/hooks/admin/useSystemSettings'

const SETTING_LABELS: Record<string, { label: string; type?: 'boolean' }> = {
  max_outpass_hours: { label: 'Max outpass hours' },
  max_staypass_days: { label: 'Max staypass days' },
  max_night_pass_hours: { label: 'Max night pass hours' },
  max_weekly_passes: { label: 'Max weekly passes per student' },
  max_monthly_passes: { label: 'Max monthly passes per student' },
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
  const { settings, loading, saving, error, saved, updateDraft, saveSettings } = useSystemSettings()

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
        <p className="dashboard-subheading mt-1.5 text-sm sm:text-[15px]">System-wide configuration</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Settings saved successfully.
        </div>
      )}

      <div className="glass-panel-strong max-w-2xl space-y-5 p-6">
        {Object.entries(SETTING_LABELS).map(([key, meta]) => (
          <div key={key}>
            <Label htmlFor={key}>{meta.label}</Label>
            {meta.type === 'boolean' ? (
              <select
                id={key}
                value={settings[key] ?? 'false'}
                onChange={(e) => updateDraft(key, e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
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
              />
            )}
          </div>
        ))}

        <Button type="button" onClick={saveSettings} loading={saving}>
          Save settings
        </Button>
      </div>
    </div>
  )
}
