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

      {/* Glassmorphism wash on the background only — cards stay solid */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]',
          isDark ? 'opacity-0' : 'opacity-100',
        )}
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 130% 90% at 50% 35%, rgba(255,255,255,0.14) 0%, transparent 55%)',
            'linear-gradient(180deg, rgba(8,32,64,0.22) 0%, rgba(8,32,64,0.1) 40%, rgba(2,10,24,0.28) 100%)',
          ].join(', '),
          backdropFilter: 'blur(10px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(10px) saturate(1.2)',
        }}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]',
          isDark ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 120% 85% at 50% 30%, rgba(56,132,204,0.16) 0%, transparent 55%)',
            'linear-gradient(180deg, rgba(2,8,20,0.32) 0%, rgba(2,8,20,0.14) 42%, rgba(0,0,0,0.38) 100%)',
          ].join(', '),
          backdropFilter: 'blur(12px) saturate(1.25)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.25)',
        }}
        aria-hidden
      />

      {/* Soft edge vignette */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 85% 75% at 50% 45%, transparent 35%, rgba(2,6,23,0.34) 100%)',
          opacity: isDark ? 0.85 : 0.55,
        }}
        aria-hidden
      />

      <div className="relative z-10">{children}</div>
    </div>
  )
}
