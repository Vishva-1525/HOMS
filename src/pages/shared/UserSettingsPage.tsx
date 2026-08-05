import { LogOut } from 'lucide-react'
import { AppDownloadCard } from '@/components/settings/AppDownloadCard'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/contexts/AuthProvider'
import { getRoleDisplayLabel } from '@/components/layout/nav'

export function UserSettingsPage() {
  const { profile, role, signOut } = useAuth()

  if (!profile || !role) return null

  const roleLabel = getRoleDisplayLabel(role, profile.warden_tier)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="App install and account preferences"
      />

      <div className="glass-panel flex items-center gap-4 p-5">
        <UserAvatar name={profile.full_name} photoUrl={profile.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{profile.full_name}</p>
          <p className="text-sm text-slate-600">{roleLabel}</p>
          {profile.phone?.trim() && (
            <p className="mt-0.5 text-sm text-slate-500">{profile.phone}</p>
          )}
        </div>
      </div>

      <AppDownloadCard />

      <div className="glass-panel p-5">
        <h2 className="dashboard-heading text-sm font-semibold">Account</h2>
        <p className="dashboard-muted mt-1 text-sm">
          Sign out of HOMS on this device.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 text-red-700 hover:bg-red-50"
          onClick={() => void signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Sign out
        </Button>
      </div>
    </div>
  )
}
