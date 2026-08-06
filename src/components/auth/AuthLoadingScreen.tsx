import { AuthBackground } from '@/components/auth/AuthBackground'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface AuthLoadingScreenProps {
  label?: string
  /** When set, show retry / sign-out instead of an endless spinner. */
  errorMessage?: string | null
  onRetry?: () => void
  onSignOut?: () => void
  retrying?: boolean
}

export function AuthLoadingScreen({
  label = 'Loading your account...',
  errorMessage,
  onRetry,
  onSignOut,
  retrying = false,
}: AuthLoadingScreenProps) {
  const showError = Boolean(errorMessage)

  return (
    <AuthBackground>
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6">
        <SvceEmblem size="lg" withRing />
        {showError ? (
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-sm text-slate-700">{errorMessage}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {onRetry && (
                <Button type="button" onClick={onRetry} disabled={retrying}>
                  {retrying ? 'Retrying…' : 'Retry'}
                </Button>
              )}
              {onSignOut && (
                <Button type="button" variant="outline" onClick={onSignOut} disabled={retrying}>
                  Sign out
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Spinner label={label} />
        )}
      </div>
    </AuthBackground>
  )
}
