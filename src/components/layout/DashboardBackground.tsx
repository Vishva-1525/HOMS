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
        'dashboard-shell relative min-h-[100dvh] overflow-x-hidden bg-cover bg-center bg-no-repeat',
        'bg-scroll md:bg-fixed',
        className,
      )}
      style={{
        backgroundImage: `url('${SVCE_CAMPUS_BG_URL}')`,
        ...style,
      }}
    >
      {/* Layered wash — soft depth so glass panels and tables stay crisp */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0B3664]/72 via-[#0f172a]/58 to-[#020617]/72"
        aria-hidden
      />
      {/* Ambient highlights */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_50%_at_12%_-8%,rgba(255,255,255,0.22)_0%,transparent_52%),radial-gradient(ellipse_65%_40%_at_92%_8%,rgba(26,92,160,0.22)_0%,transparent_48%),radial-gradient(ellipse_50%_35%_at_70%_100%,rgba(14,116,144,0.08)_0%,transparent_55%)]"
        aria-hidden
      />
      {/* Fine grain for texture without clutter */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
