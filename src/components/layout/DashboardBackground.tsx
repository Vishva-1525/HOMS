import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeProvider'
import { SVCE_CAMPUS_DAY_URL, SVCE_CAMPUS_NIGHT_URL } from '@/lib/branding'
import { cn } from '@/lib/utils'

interface DashboardBackgroundProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

const PHOTO_TRANSITION =
  'pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat bg-scroll transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none md:bg-fixed'

export function DashboardBackground({ children, className, style }: DashboardBackgroundProps) {
  const { isDark } = useTheme()

  useEffect(() => {
    ;[SVCE_CAMPUS_DAY_URL, SVCE_CAMPUS_NIGHT_URL].forEach((url) => {
      const img = new Image()
      img.src = url
    })
  }, [])

  return (
    <div
      className={cn('dashboard-shell relative min-h-[100dvh] overflow-x-hidden bg-[#0B3664]', className)}
      style={style}
    >
      {/* Day / night campus photos — cross-fade on theme toggle */}
      <div
        className={cn(PHOTO_TRANSITION, isDark ? 'opacity-0' : 'opacity-100')}
        style={{ backgroundImage: `url('${SVCE_CAMPUS_DAY_URL}')` }}
        aria-hidden
      />
      <div
        className={cn(PHOTO_TRANSITION, isDark ? 'opacity-100' : 'opacity-0')}
        style={{ backgroundImage: `url('${SVCE_CAMPUS_NIGHT_URL}')` }}
        aria-hidden
      />

      {/* Layered wash — soft depth so glass panels stay readable */}
      <div
        className={cn(
          'dashboard-bg-wash pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]',
          isDark ? 'opacity-0' : 'opacity-100',
        )}
        style={{
          backgroundImage:
            'linear-gradient(to bottom right, rgba(11,54,100,0.72), rgba(15,23,42,0.58), rgba(2,6,23,0.72))',
        }}
        aria-hidden
      />
      <div
        className={cn(
          'dashboard-bg-wash pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]',
          isDark ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          backgroundImage:
            'linear-gradient(155deg, rgba(8,24,48,0.84) 0%, rgba(11,18,32,0.8) 42%, rgba(2,6,23,0.9) 100%)',
        }}
        aria-hidden
      />

      {/* Ambient highlights */}
      <div
        className={cn(
          'dashboard-bg-ambient pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]',
          isDark ? 'opacity-0' : 'opacity-100',
        )}
        style={{
          backgroundImage:
            'radial-gradient(ellipse 85% 50% at 12% -8%, rgba(255,255,255,0.22) 0%, transparent 52%), radial-gradient(ellipse 65% 40% at 92% 8%, rgba(26,92,160,0.22) 0%, transparent 48%), radial-gradient(ellipse 50% 35% at 70% 100%, rgba(14,116,144,0.08) 0%, transparent 55%)',
        }}
        aria-hidden
      />
      <div
        className={cn(
          'dashboard-bg-ambient pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]',
          isDark ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 15% 0%, rgba(26,92,160,0.3) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(14,116,144,0.14) 0%, transparent 50%), radial-gradient(ellipse 50% 35% at 70% 100%, rgba(14,116,144,0.1) 0%, transparent 55%)',
        }}
        aria-hidden
      />

      {/* Fine grain */}
      <div
        className="dashboard-bg-grain pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)] dark:opacity-[0.045]"
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
