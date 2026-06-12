import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthProvider'
import { AuthBackground } from '@/components/auth/AuthBackground'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { getDashboardPath, LOGIN_PATH } from '@/lib/routes'
import { getPasswordStrength } from '@/lib/password-strength'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, profile, role, loading, needsPasswordChange, changePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (!user) {
    return <Navigate to={LOGIN_PATH} replace />
  }

  if (!profile || role !== 'student') {
    return <Navigate to={LOGIN_PATH} replace />
  }

  if (!needsPasswordChange) {
    return <Navigate to={getDashboardPath('student')} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const strength = getPasswordStrength(password)
    if (strength.level === 'weak') {
      setError('Choose a stronger password — at least 8 characters with mixed case and numbers.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      await changePassword(password)
      navigate(getDashboardPath('student'), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.')
      setSubmitting(false)
    }
  }

  return (
    <AuthBackground>
      <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10 sm:px-6">
        <div className="glass-panel-strong w-full max-w-md p-8 sm:p-9">
          <div className="flex flex-col items-center text-center">
            <SvceEmblem size="lg" withRing />
            <h1 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">
              Set your new password
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              You must change your initial password before continuing.
            </p>
          </div>

          {error && (
            <div
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <PasswordStrengthBar password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
              />
            </div>

            <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
              Update password
            </Button>
          </form>
        </div>
      </div>
    </AuthBackground>
  )
}
