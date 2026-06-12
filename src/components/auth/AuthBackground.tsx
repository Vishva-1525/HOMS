import type { ReactNode } from 'react'
import { SVCE_LOGIN_BG_URL } from '@/lib/branding'
import { cn } from '@/lib/utils'

interface AuthBackgroundProps {
  children: ReactNode
  className?: string
}

export function AuthBackground({ children, className }: AuthBackgroundProps) {
  return (
    <div
      className={cn(
        'relative min-h-[100dvh] bg-cover bg-no-repeat',
        'bg-[center_35%] bg-scroll md:bg-fixed md:bg-center',
        className,
      )}
      style={{ backgroundImage: `url('${SVCE_LOGIN_BG_URL}')` }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0D3F72]/70 via-slate-900/45 to-emerald-950/55"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.1)_0%,_transparent_60%)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">{children}</div>
    </div>
  )
}
