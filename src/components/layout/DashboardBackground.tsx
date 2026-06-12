import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardBackgroundProps {
  children: ReactNode
  className?: string
}

export function DashboardBackground({ children, className }: DashboardBackgroundProps) {
  return (
    <div className={cn('dashboard-shell dashboard-bg relative min-h-screen', className)}>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900/30 via-slate-800/10 to-emerald-950/25"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.12)_0%,_transparent_55%)]" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
