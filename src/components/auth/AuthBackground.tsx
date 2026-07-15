import { useEffect, type ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeProvider'
import { SVCE_CAMPUS_DAY_URL, SVCE_CAMPUS_NIGHT_URL } from '@/lib/branding'
import { cn } from '@/lib/utils'

interface AuthBackgroundProps {
  children: ReactNode
  className?: string
}

const PHOTO_TRANSITION =
  'pointer-events-none absolute inset-0 bg-[center_35%] bg-cover bg-no-repeat bg-scroll transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none md:bg-fixed md:bg-center'

export function AuthBackground({ children, className }: AuthBackgroundProps) {
  const { isDark } = useTheme()

  useEffect(() => {
    ;[SVCE_CAMPUS_DAY_URL, SVCE_CAMPUS_NIGHT_URL].forEach((url) => {
      const img = new Image()
      img.src = url
    })
  }, [])

  return (
    <div className={cn('relative min-h-[100dvh] overflow-hidden bg-[#0B3664]', className)}>
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

      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]',
          isDark ? 'opacity-0' : 'opacity-100',
        )}
        style={{
          backgroundImage:
            'linear-gradient(to bottom right, rgba(13,63,114,0.7), rgba(15,23,42,0.45), rgba(2,44,34,0.55))',
        }}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]',
          isDark ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          backgroundImage:
            'linear-gradient(155deg, rgba(8,24,48,0.82) 0%, rgba(11,18,32,0.78) 45%, rgba(2,6,23,0.88) 100%)',
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.1)_0%,_transparent_60%)] transition-opacity duration-[900ms] dark:opacity-50"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">{children}</div>
    </div>
  )
}
