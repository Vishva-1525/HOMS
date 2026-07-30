import type { CSSProperties, ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeProvider'
import { cn } from '@/lib/utils'

interface DashboardBackgroundProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function DashboardBackground({ children, className, style }: DashboardBackgroundProps) {
  const { isDark } = useTheme()

  return (
    <div
      className={cn(
        'dashboard-shell relative min-h-[100dvh] overflow-x-hidden',
        isDark ? 'bg-[#070B14]' : 'bg-[#E8EEF5]',
        className,
      )}
      style={style}
    >
      {/* Soft solid brand wash — no photo / no glass */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 90% 60% at 50% -10%, #152338 0%, transparent 55%)'
            : 'radial-gradient(ellipse 90% 60% at 50% -10%, #dbe7f5 0%, transparent 55%)',
        }}
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
