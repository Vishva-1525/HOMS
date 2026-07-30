import type { ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeProvider'
import { cn } from '@/lib/utils'

interface AuthBackgroundProps {
  children: ReactNode
  className?: string
}

export function AuthBackground({ children, className }: AuthBackgroundProps) {
  const { isDark } = useTheme()

  return (
    <div
      className={cn(
        'relative min-h-[100dvh] overflow-hidden',
        isDark ? 'bg-[#070B14]' : 'bg-[#E8EEF5]',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isDark
            ? [
                'radial-gradient(ellipse 80% 50% at 20% 0%, #1a2740 0%, transparent 50%)',
                'radial-gradient(ellipse 70% 45% at 90% 100%, #152338 0%, transparent 45%)',
              ].join(', ')
            : [
                'radial-gradient(ellipse 80% 50% at 15% 0%, #d4e4f7 0%, transparent 50%)',
                'radial-gradient(ellipse 70% 45% at 90% 100%, #c9daf0 0%, transparent 45%)',
              ].join(', '),
        }}
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">{children}</div>
    </div>
  )
}
