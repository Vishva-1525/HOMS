import { ClipboardList } from 'lucide-react'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { useAuth } from '@/contexts/AuthProvider'
import { SVCE_APP_SHORT } from '@/lib/branding'

interface SecurityTopBarProps {
  onLogClick: () => void
}

export function SecurityTopBar({ onLogClick }: SecurityTopBarProps) {
  const { profile } = useAuth()

  return (
    <header className="glass-nav sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between px-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <SvceEmblem size="sm" withRing />
        <div className="hidden min-w-0 leading-tight sm:block">
          <p className="truncate text-xs font-semibold text-slate-900">{SVCE_APP_SHORT}</p>
          <p className="truncate text-[10px] text-slate-600">Security</p>
        </div>
      </div>

      <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold tracking-tight text-slate-900">
        Gate Scanner
      </h1>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onLogClick}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/50 px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:bg-white/70"
        >
          <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Log</span>
        </button>
        <UserAvatar name={profile?.full_name ?? 'Guard'} size="sm" />
      </div>
    </header>
  )
}
