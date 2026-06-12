import { Spinner } from '@/components/ui/spinner'

export function AuthLoadingScreen({ label = 'Loading your account...' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner label={label} />
    </div>
  )
}
