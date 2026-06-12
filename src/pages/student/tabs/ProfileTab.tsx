import { IconUser } from '@tabler/icons-react'

export function ProfileTab() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <IconUser className="h-7 w-7 text-muted-foreground" stroke={1.5} />
      </div>
      <h2 className="text-lg font-semibold">Profile</h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        Manage your account and hostel details. Coming soon.
      </p>
    </div>
  )
}
