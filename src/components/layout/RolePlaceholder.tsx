import { useAuth } from '@/contexts/AuthProvider'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { DashboardBackground } from '@/components/layout/DashboardBackground'
import { Button } from '@/components/ui/button'
import { IconLogout } from '@tabler/icons-react'

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
    <DashboardBackground>
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-6 sm:p-8">
        <div className="glass-panel-strong w-full max-w-md p-8 text-center sm:p-10">
          <SvceEmblem size="xl" withRing className="mx-auto" />
          <h1 className="dashboard-heading mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="dashboard-subheading mt-3 text-base sm:text-lg">
            {profile?.full_name || 'User'} &mdash; {role ? ROLE_LABELS[role] : 'Unknown role'}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-8 gap-2 border-white/60 bg-white/40 hover:bg-white/60"
            onClick={() => signOut()}
          >
            <IconLogout className="h-4 w-4" stroke={1.75} />
            Sign out
          </Button>
        </div>
      </div>
    </DashboardBackground>
  )
}
