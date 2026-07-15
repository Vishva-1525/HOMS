import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthProvider'
import { AuthBackground } from '@/components/auth/AuthBackground'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { LoginBrandPanel } from '@/components/auth/LoginBrandPanel'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { PostLoginRedirect } from '@/components/auth/PostLoginRedirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SVCE_APP_SHORT } from '@/lib/branding'
import { FORGOT_PASSWORD_PATH } from '@/lib/routes'

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
    <AuthBackground>
      <div className="flex min-h-[100dvh] items-stretch justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
        <div className="grid w-full max-w-6xl grid-cols-1 items-stretch gap-5 lg:grid-cols-2 lg:gap-8">
          <LoginBrandPanel className="hidden lg:flex" />

          <section className="login-glass-card flex w-full flex-col justify-center p-7 sm:p-9">
            <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
              <SvceEmblem size="lg" withRing className="lg:hidden" />
              <div className="mt-5 space-y-1 lg:mt-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {SVCE_APP_SHORT}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Welcome back
                </h1>
                <p className="text-sm text-slate-600">Sign in to continue to your dashboard</p>
              </div>
            </div>

            {error && (
              <div
                className="mb-5 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800 backdrop-blur-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or Register Number</Label>
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="email@svce.ac.in or 21CS001"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to={FORGOT_PASSWORD_PATH}
                    className="text-xs font-medium text-[#1A5CA0] underline-offset-4 hover:underline"
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
                />
              </div>

              <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-xs leading-relaxed text-slate-500 lg:text-left">
              Having trouble? Contact your hostel warden office.
            </p>
          </section>
        </div>
      </div>
    </AuthBackground>
  )
}
