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
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0D3F72]/45 via-slate-900/25 to-slate-950/40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.14)_0%,_transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
