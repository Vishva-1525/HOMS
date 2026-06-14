import { ClipboardList, LogOut } from 'lucide-react'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { useAuth } from '@/contexts/AuthProvider'
import { SVCE_APP_SHORT } from '@/lib/branding'
import { cn } from '@/lib/utils'

interface SecurityTopBarProps {
  onLogClick: () => void
}

function HeaderAction({
  onClick,
  label,
  icon: Icon,
  className,
}: {
  onClick: () => void
  label: string
  icon: typeof ClipboardList
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-white/60 bg-white/55 px-2.5 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-white/80 active:scale-95 sm:min-h-0 sm:min-w-0 sm:px-3 sm:py-1.5',
        className,
      )}
      aria-label={label}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

export function SecurityTopBar({ onLogClick }: SecurityTopBarProps) {
  const { profile, signOut } = useAuth()

  return (
    <header className="glass-nav sticky top-0 z-30 flex shrink-0 items-center justify-between gap-2 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <SvceEmblem size="sm" withRing />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[11px] font-semibold text-slate-900 sm:text-xs">{SVCE_APP_SHORT}</p>
          <p className="truncate text-[10px] text-slate-600">Security</p>
        </div>
      </div>

      <h1 className="pointer-events-none absolute left-1/2 max-w-[38%] -translate-x-1/2 truncate text-center text-xs font-semibold tracking-tight text-slate-900 sm:max-w-none sm:text-sm">
        Gate Scanner
      </h1>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <HeaderAction onClick={onLogClick} label="Log" icon={ClipboardList} />
        <HeaderAction onClick={() => signOut()} label="Sign out" icon={LogOut} />
        <UserAvatar name={profile?.full_name ?? 'Guard'} size="sm" />
      </div>
    </header>
  )
}
