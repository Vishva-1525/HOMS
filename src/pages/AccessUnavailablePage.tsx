import { LogOut, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthProvider'
import { LOGIN_PATH } from '@/lib/routes'
import { useNavigate } from 'react-router-dom'

/** Shown when a role no longer has a dashboard (e.g. security guard). */
export function AccessUnavailablePage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate(LOGIN_PATH, { replace: true })
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F5F7FA] px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <ShieldOff className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Security portal removed</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The security dashboard is no longer available
          {profile?.full_name ? ` for ${profile.full_name}` : ''}. Contact the hostel admin if you
          need access to another role.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Sign out
        </Button>
      </div>
    </div>
  )
}
