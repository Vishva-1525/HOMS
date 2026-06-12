import { AuthBackground } from '@/components/auth/AuthBackground'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { Spinner } from '@/components/ui/spinner'

export function AuthLoadingScreen({ label = 'Loading your account...' }: { label?: string }) {
  return (
    <AuthBackground>
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6">
        <SvceEmblem size="lg" withRing />
        <Spinner label={label} />
      </div>
    </AuthBackground>
  )
}
