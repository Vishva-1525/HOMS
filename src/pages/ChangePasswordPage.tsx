import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthProvider'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--svce-page-bg)] px-4 py-10">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--svce-border-default)] bg-white p-8">
        <div className="flex justify-center">
          <img
            src="/svce-logo.png"
            alt="Sri Venkateswara College of Engineering"
            className="h-12 w-auto"
          />
        </div>

        <h1 className="mt-6 text-center text-xl font-semibold text-[#1A1A2E]">
          Set your new password
        </h1>
        <p className="mt-1 text-center text-sm text-[#4B5563]">
          You must change your initial password before continuing.
        </p>

        {error && (
          <div
            className="mt-6 rounded-[var(--radius-md)] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
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
              className="border-[var(--svce-border-default)]"
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
              className="border-[var(--svce-border-default)]"
            />
          </div>

          <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
            Update password
          </Button>
        </form>
      </div>
    </div>
  )
}
