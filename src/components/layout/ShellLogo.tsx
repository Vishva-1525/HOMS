import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { SVCE_APP_SHORT, SVCE_COLLEGE_NAME } from '@/lib/branding'
import { cn } from '@/lib/utils'

interface ShellLogoProps {
  collapsed?: boolean
  className?: string
  showLabel?: boolean
  /** `dark` for navy sidebar; `light` for the top header bar. */
  tone?: 'light' | 'dark'
  /** Hide long college name on very narrow headers - keeps emblem + app short name only. */
  compact?: boolean
}

export function ShellLogo({
  collapsed = false,
  className,
  showLabel = !collapsed,
  tone = 'dark',
  compact = false,
}: ShellLogoProps) {
  if (collapsed) {
    return <SvceEmblem size="sm" withRing className={className} />
  }

  const isLight = tone === 'light'

  return (
    <div className={cn('flex min-w-0 max-w-full items-center gap-2 sm:gap-3', className)}>
      <SvceEmblem size="sm" withRing className="shrink-0" />
      {showLabel && (
        <div className="min-w-0 leading-tight">
          <p
            className={cn(
              'truncate text-sm font-semibold tracking-tight',
              isLight ? 'text-slate-900' : 'text-white',
            )}
          >
            {SVCE_APP_SHORT}
          </p>
          {!compact && (
            <p
              className={cn(
                'truncate text-[10px]',
                isLight ? 'text-slate-600' : 'text-white/65',
              )}
              title={SVCE_COLLEGE_NAME}
            >
              {SVCE_COLLEGE_NAME}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
