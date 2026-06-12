import { IconUser } from '@tabler/icons-react'

export function ProfileTab() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="glass-panel-strong flex h-16 w-16 items-center justify-center">
        <IconUser className="h-8 w-8 text-muted-foreground" stroke={1.5} />
      </div>
      <h2 className="text-lg font-semibold">Profile</h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        Manage your account and hostel details. Coming soon.
      </p>
    </div>
  )
}
