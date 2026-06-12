import { useAuth } from '@/contexts/AuthProvider'

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  warden: 'Warden',
  security_guard: 'Security Guard',
  parent: 'Parent',
  admin: 'Administrator',
}

export function RolePlaceholder({ title }: { title: string }) {
  const { profile, role, signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-lg text-muted-foreground">
        {profile?.full_name || 'User'} &mdash; {role ? ROLE_LABELS[role] : 'Unknown role'}
      </p>
      <button
        type="button"
        onClick={() => signOut()}
        className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Sign out
      </button>
    </div>
  )
}
