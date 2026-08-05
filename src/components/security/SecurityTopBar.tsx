import { ClipboardList, CloudOff, LogOut, RefreshCw } from 'lucide-react'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { useAuth } from '@/contexts/AuthProvider'
import { useSecurityOfflineContext } from '@/contexts/SecurityOfflineContext'
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
        'inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-[var(--glass-bg)] active:scale-95 sm:min-h-0 sm:min-w-0 sm:px-3 sm:py-1.5',
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
  const { online, pendingCount, prefetching, syncing, prefetch, sync } = useSecurityOfflineContext()

  return (
    <header className="glass-nav sticky top-0 z-30 flex shrink-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-5">
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
        <ThemeToggle className="border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-sm" />
        <HeaderAction onClick={onLogClick} label="Log" icon={ClipboardList} />
        <HeaderAction onClick={() => signOut()} label="Sign out" icon={LogOut} />
        <UserAvatar name={profile?.full_name ?? 'Guard'} size="sm" />
      </div>
      </div>

      {(!online || pendingCount > 0) && (
        <div
          className={cn(
            'flex items-center justify-between gap-2 border-t px-3 py-1.5 text-xs sm:px-5',
            online ? 'border-amber-200/80 bg-amber-50 text-amber-900' : 'border-slate-200/80 bg-slate-100 text-slate-800',
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {!online && <CloudOff className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
            <span className="truncate font-medium">
              {!online
                ? 'Offline mode — scans saved locally'
                : `${pendingCount} scan${pendingCount === 1 ? '' : 's'} waiting to sync`}
            </span>
          </div>
          {online && pendingCount > 0 && (
            <button
              type="button"
              onClick={() => void sync()}
              disabled={syncing}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              <RefreshCw className={cn('h-3 w-3', syncing && 'animate-spin')} />
              Sync
            </button>
          )}
          {online && pendingCount === 0 && prefetching && (
            <span className="shrink-0 text-slate-500">Updating cache…</span>
          )}
          {online && !prefetching && (
            <button
              type="button"
              onClick={() => void prefetch()}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-semibold hover:bg-white/60"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          )}
        </div>
      )}
    </header>
  )
}
