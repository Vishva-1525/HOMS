import { useAuth } from '@/contexts/AuthProvider'
import { ShellLogo } from '@/components/layout/ShellLogo'

interface SecurityTopBarProps {
  onLogClick: () => void
}

function GuardAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white"
      title={name}
    >
      {initials || 'G'}
    </div>
  )
}

export function SecurityTopBar({ onLogClick }: SecurityTopBarProps) {
  const { profile } = useAuth()

  return (
    <header className="relative flex h-[52px] shrink-0 items-center justify-between bg-[#0D3F72] px-4">
      <ShellLogo className="h-7 w-auto" />

      <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-white">
        Gate Scanner
      </h1>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onLogClick}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
        >
          Log
        </button>
        <GuardAvatar name={profile?.full_name ?? 'Guard'} />
      </div>
    </header>
  )
}
