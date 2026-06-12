import { IconBuildingCommunity, IconLogout } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthProvider'
import { DashboardBackground } from '@/components/layout/DashboardBackground'
import { Button } from '@/components/ui/button'

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <div className="glass-panel-strong w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-white/60">
            <IconBuildingCommunity className="h-8 w-8" stroke={1.5} />
          </div>
          <h1 className="dashboard-heading text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="dashboard-subheading mt-3 text-lg">
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
