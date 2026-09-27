import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  confirmPasswordResetWithOtp,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
} from '@/lib/auth'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPasswordStrength } from '@/lib/password-strength'
import { LOGIN_PATH } from '@/lib/routes'

type Step = 'email' | 'verify' | 'password' | 'done'

const RESEND_COOLDOWN_SECONDS = 60

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  function resetToEmailStep() {
    setStep('email')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setMessage(null)
  }

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  async function sendCode() {
    setError(null)
    setSubmitting(true)

    try {
      const resultMessage = await requestPasswordResetOtp(email)
      setMessage(resultMessage)
      setOtp('')
      setStep('verify')
      setResendIn(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestCode(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    await sendCode()
  }

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await verifyPasswordResetOtp(email, otp)
      setMessage('Code verified. Create your new password.')
      setStep('password')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSetPassword(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const strength = getPasswordStrength(newPassword)
    if (strength.level === 'weak') {
      setError('Choose a stronger password — at least 8 characters with mixed case and numbers.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const resultMessage = await confirmPasswordResetWithOtp(email, otp, newPassword)
      setMessage(resultMessage)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.')
    } finally {
      setSubmitting(false)
    }
  }

  const description =
    step === 'verify'
      ? 'Enter the verification code sent to your email'
      : step === 'password'
        ? 'Choose a new password for your account'
        : step === 'done'
          ? 'Your password has been updated'
          : 'Enter your email or register number to receive a verification code'

  return (
    <AuthLayout title="Forgot Password" description={description}>
      {step === 'email' && (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email or register number</Label>
            <Input
              id="email"
              type="text"
              autoComplete="username"
              placeholder="email@svce.ac.in or register number"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll send a 6-digit verification code to the email on your account.
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send verification code'}
          </Button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          {message && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">{message}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="otp">Verification code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="6-digit code"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting || otp.length !== 6}>
            {submitting ? 'Verifying...' : 'Verify code'}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={resetToEmailStep}
              disabled={submitting}
            >
              Use a different account
            </button>
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              onClick={() => void sendCode()}
              disabled={submitting || resendIn > 0}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handleSetPassword} className="space-y-4">
          {message && (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">{message}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
            />
            <PasswordStrengthBar password={newPassword} />
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

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update password'}
          </Button>
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
