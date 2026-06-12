import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isEmailIdentifier, requestPasswordReset, requestStudentPasswordReset, resetStudentPasswordWithOtp } from '@/lib/auth'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LOGIN_PATH } from '@/lib/routes'

type Step = 'request' | 'student-otp' | 'done'

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<Step>('request')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isStudentFlow = !isEmailIdentifier(identifier)

  async function handleRequest(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    try {
      if (isEmailIdentifier(identifier)) {
        await requestPasswordReset(identifier.trim().toLowerCase())
        setStep('done')
        setMessage('Check your email for a password reset link.')
      } else {
        const resultMessage = await requestStudentPasswordReset(identifier)
        setStep('student-otp')
        setMessage(resultMessage)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset instructions.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStudentReset(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      await resetStudentPasswordWithOtp(identifier, otp, newPassword)
      setStep('done')
      setMessage('Your password has been reset. You can now sign in.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot Password"
      description={
        step === 'student-otp'
          ? 'Enter the OTP sent to your parent\'s registered email'
          : 'Reset your account password'
      }
    >
      {step === 'request' && (
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or Register Number</Label>
            <Input
              id="identifier"
              type="text"
              placeholder="email@svce.ac.in or 21CS001"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={submitting}
            />
            {isStudentFlow && identifier.trim() && (
              <p className="text-xs text-muted-foreground">
                Students: OTP will be sent to your parent&apos;s registered email.
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send reset instructions'}
          </Button>

          <p className="text-center text-sm">
            <Link to={LOGIN_PATH} className="text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}

      {step === 'student-otp' && (
        <form onSubmit={handleStudentReset} className="space-y-4">
          {message && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">{message}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="otp">OTP</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="6-digit code"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
            {submitting ? 'Resetting...' : 'Reset password'}
          </Button>

          <p className="text-center text-sm">
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setStep('request')
                setOtp('')
                setNewPassword('')
                setConfirmPassword('')
                setError(null)
                setMessage(null)
              }}
            >
              Request a new OTP
            </button>
          </p>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-4 text-center">
          {message && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">{message}</p>
          )}
          <Link to={LOGIN_PATH} className="block">
            <Button className="w-full">Back to sign in</Button>
          </Link>
        </div>
      )}
    </AuthLayout>
  )
}
