import { useEffect, useState, type ReactNode } from 'react'
import { useOptionalTheme } from '@/contexts/ThemeProvider'
import { SVCE_CAMPUS_DAY_URL, SVCE_CAMPUS_NIGHT_URL } from '@/lib/branding'
import { cn } from '@/lib/utils'

interface AuthBackgroundProps {
  children: ReactNode
  className?: string
}

function readDomDark(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export function AuthBackground({ children, className }: AuthBackgroundProps) {
  const theme = useOptionalTheme()
  const [domDark, setDomDark] = useState(readDomDark)
  const isDark = theme?.isDark ?? domDark

  useEffect(() => {
    if (theme) return
    const sync = () => setDomDark(readDomDark())
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [theme])

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
          'pointer-events-none absolute inset-0 h-full w-full scale-[1.03] object-cover object-[center_35%] transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none md:object-center',
          isDark ? 'opacity-0' : 'opacity-100',
        )}
      />
      <img
        src={SVCE_CAMPUS_NIGHT_URL}
        alt=""
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 h-full w-full scale-[1.03] object-cover object-[center_35%] transition-opacity duration-[900ms] ease-[cubic-bezier(0.45,0,0.2,1)] motion-reduce:transition-none md:object-center',
          isDark ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Liquid glass morphism — background only */}
      <div
        className={cn(
          'campus-liquid-glass pointer-events-none absolute inset-0',
          isDark ? 'campus-liquid-glass-dark' : 'campus-liquid-glass-light',
        )}
        aria-hidden
      />
      <div
        className={cn(
          'campus-liquid-shine pointer-events-none absolute inset-0',
          isDark ? 'opacity-70' : 'opacity-95',
        )}
        aria-hidden
      />
      <div
        className={cn(
          'campus-liquid-blob campus-liquid-blob-a pointer-events-none absolute',
          isDark ? 'opacity-40' : 'opacity-60',
        )}
        aria-hidden
      />
      <div
        className={cn(
          'campus-liquid-blob campus-liquid-blob-b pointer-events-none absolute',
          isDark ? 'opacity-35' : 'opacity-50',
        )}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">{children}</div>
    </div>
  )
}
