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
    <div className={cn('relative min-h-[100dvh] overflow-hidden bg-[#0B3664]', className)}>
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

      {/* Glassmorphism wash on background only — login cards stay solid */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]',
          isDark ? 'opacity-0' : 'opacity-100',
        )}
        style={{
          background:
            'linear-gradient(180deg, rgba(8,32,64,0.18) 0%, rgba(8,32,64,0.08) 45%, rgba(2,10,24,0.28) 100%)',
          backdropFilter: 'blur(8px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(8px) saturate(1.2)',
        }}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)]',
          isDark ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background:
            'linear-gradient(180deg, rgba(2,8,20,0.28) 0%, rgba(2,8,20,0.12) 45%, rgba(0,0,0,0.4) 100%)',
          backdropFilter: 'blur(10px) saturate(1.25)',
          WebkitBackdropFilter: 'blur(10px) saturate(1.25)',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">{children}</div>
    </div>
  )
}
