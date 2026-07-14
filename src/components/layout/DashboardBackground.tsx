import type { CSSProperties, ReactNode } from 'react'
import { SVCE_CAMPUS_BG_URL } from '@/lib/branding'
import { cn } from '@/lib/utils'

interface DashboardBackgroundProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function DashboardBackground({ children, className, style }: DashboardBackgroundProps) {
  return (
    <div
      className={cn(
        'dashboard-shell relative min-h-[100dvh] bg-cover bg-center bg-no-repeat',
        'bg-scroll md:bg-fixed',
        className,
      )}
      style={{
        backgroundImage: `url('${SVCE_CAMPUS_BG_URL}')`,
        ...style,
      }}
    >
      {/* Base wash — keeps cards readable while preserving campus atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0D3F72]/55 via-slate-900/42 to-[#020617]/58"
        aria-hidden
      />
      {/* Soft highlight + depth — Light mode only; dark overrides via dark-dashboard.css */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_20%_-10%,rgba(255,255,255,0.28)_0%,transparent_55%),radial-gradient(ellipse_70%_45%_at_95%_5%,rgba(26,92,160,0.18)_0%,transparent_50%)]"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
