import { AppDownloadCard } from '@/components/settings/AppDownloadCard'
import { SecurityTopBar } from '@/components/security/SecurityTopBar'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthProvider'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function SecuritySettingsPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SecurityTopBar onLogClick={() => navigate('/security/log')} />

      <div className="flex-1 overflow-y-auto px-3 py-4 sm:mx-auto sm:w-full sm:max-w-lg sm:px-4">
        <div className="space-y-6">
          <div>
            <h1 className="dashboard-heading text-xl font-semibold sm:text-2xl">Settings</h1>
            <p className="dashboard-muted mt-1 text-sm">App install and account</p>
          </div>

          {profile && (
            <div className="glass-panel flex items-center gap-4 p-4">
              <UserAvatar name={profile.full_name} photoUrl={profile.avatar_url} size="md" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{profile.full_name}</p>
                <p className="text-sm text-slate-600">Security</p>
              </div>
            </div>
          )}

          <AppDownloadCard />

          <div className="glass-panel p-4">
            <Button
              type="button"
              variant="outline"
              className="w-full text-red-700 hover:bg-red-50"
              onClick={() => void signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
