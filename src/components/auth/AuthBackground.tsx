import { useEffect, type ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeProvider'
import { SVCE_CAMPUS_DAY_URL, SVCE_CAMPUS_NIGHT_URL } from '@/lib/branding'
import { cn } from '@/lib/utils'

interface AuthBackgroundProps {
  children: ReactNode
  className?: string
}

export function AuthBackground({ children, className }: AuthBackgroundProps) {
  const { isDark } = useTheme()

  useEffect(() => {
    ;[SVCE_CAMPUS_DAY_URL, SVCE_CAMPUS_NIGHT_URL].forEach((url) => {
      const img = new Image()
      img.src = url
    })
  }, [])

  return (
    <div className={cn('relative min-h-[100dvh] overflow-hidden', className)}>
      {/* Plain photos only — no color wash / gradient overlays */}
      <img
        src={SVCE_CAMPUS_DAY_URL}
        alt=""
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_35%] transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none md:object-center',
          isDark ? 'opacity-0' : 'opacity-100',
        )}
      />
      <img
        src={SVCE_CAMPUS_NIGHT_URL}
        alt=""
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_35%] transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none md:object-center',
          isDark ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">{children}</div>
    </div>
  )
}
