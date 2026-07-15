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
    <div className={cn('relative min-h-[100dvh] overflow-hidden bg-slate-900', className)}>
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

      <div className="relative z-10 flex min-h-[100dvh] flex-col">{children}</div>
    </div>
  )
}
