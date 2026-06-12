import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthProvider'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { getDashboardPath, LOGIN_PATH } from '@/lib/routes'

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

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
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
    <AuthLayout
      title="Set Your Password"
      description="You must change your initial password before continuing."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
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

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </AuthLayout>
  )
}
