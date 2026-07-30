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
      {/* Day / night campus photos */}
      <div
        className={cn(PHOTO_TRANSITION, 'scale-[1.02]', isDark ? 'opacity-0' : 'opacity-100')}
        style={{ backgroundImage: `url('${SVCE_CAMPUS_DAY_URL}')` }}
        aria-hidden
      />
      <div
        className={cn(PHOTO_TRANSITION, 'scale-[1.02]', isDark ? 'opacity-100' : 'opacity-0')}
        style={{ backgroundImage: `url('${SVCE_CAMPUS_NIGHT_URL}')` }}
        aria-hidden
      />

      {/* Liquid glass morphism — background only */}
      <div
        className={cn(
          'campus-liquid-glass pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]',
          isDark ? 'campus-liquid-glass-dark opacity-100' : 'campus-liquid-glass-light opacity-100',
        )}
        aria-hidden
      />

      {/* Specular liquid highlight */}
      <div
        className={cn(
          'campus-liquid-shine pointer-events-none absolute inset-0 transition-opacity duration-[900ms]',
          isDark ? 'opacity-70' : 'opacity-90',
        )}
        aria-hidden
      />

      {/* Soft liquid blobs */}
      <div
        className={cn(
          'campus-liquid-blob campus-liquid-blob-a pointer-events-none absolute transition-opacity duration-[900ms]',
          isDark ? 'opacity-40' : 'opacity-55',
        )}
        aria-hidden
      />
      <div
        className={cn(
          'campus-liquid-blob campus-liquid-blob-b pointer-events-none absolute transition-opacity duration-[900ms]',
          isDark ? 'opacity-35' : 'opacity-45',
        )}
        aria-hidden
      />

      {/* Edge vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 70% at 50% 45%, transparent 30%, rgba(2,6,23,0.42) 100%)',
          opacity: isDark ? 0.9 : 0.5,
        }}
        aria-hidden
      />

      <div className="relative z-10">{children}</div>
    </div>
  )
}
