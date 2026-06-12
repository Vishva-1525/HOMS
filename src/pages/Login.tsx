import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthProvider'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { LoginBrandPanel } from '@/components/auth/LoginBrandPanel'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { PostLoginRedirect } from '@/components/auth/PostLoginRedirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FORGOT_PASSWORD_PATH } from '@/lib/routes'
import { cn } from '@/lib/utils'

export function Login() {
  const { user, profile, loading, signInWithIdentifier } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <AuthLoadingScreen label="Loading..." />
  }

  if (user && profile) {
    return <PostLoginRedirect />
  }

  if (user && !profile) {
    return <AuthLoadingScreen label="Loading your profile..." />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signInWithIdentifier(identifier, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please check your credentials.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 md:block">
        <LoginBrandPanel />
      </div>

      <div className="flex w-full flex-col bg-white md:w-1/2">
        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="mb-8 flex justify-center md:hidden">
            <img
              src="/svce-logo.png"
              alt="Sri Venkateswara College of Engineering"
              className="w-20"
            />
          </div>

          <div className="mx-auto w-full max-w-md">
            <h1 className="text-2xl font-semibold text-[#1A1A2E]">Welcome back</h1>
            <p className="mt-1 text-sm text-[#4B5563]">Sign in to HOMS</p>

            {error && (
              <div
                className="mt-6 rounded-[var(--radius-md)] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
                role="alert"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className={cn('mt-6 space-y-4', error && 'mt-4')}>
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-[#1A1A2E]">
                  Email or Register Number
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="email@svce.ac.in or 21CS001"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={submitting}
                  className="border-[var(--svce-border-default)] focus-visible:ring-[var(--svce-primary-blue)]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[#1A1A2E]">
                    Password
                  </Label>
                  <Link
                    to={FORGOT_PASSWORD_PATH}
                    className="text-xs text-[#1A5CA0] underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="border-[var(--svce-border-default)] focus-visible:ring-[var(--svce-primary-blue)]"
                />
              </div>

              <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-[var(--svce-text-muted)]">
              Having trouble? Contact your hostel warden.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
