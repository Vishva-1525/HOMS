import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { SVCE_APP_SHORT, SVCE_COLLEGE_NAME } from '@/lib/branding'
import { cn } from '@/lib/utils'

interface ShellLogoProps {
  collapsed?: boolean
  className?: string
  showLabel?: boolean
}

export function ShellLogo({ collapsed = false, className, showLabel = !collapsed }: ShellLogoProps) {
  if (collapsed) {
    return <SvceEmblem size="sm" withRing className={className} />
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <SvceEmblem size="sm" withRing />
      {showLabel && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold tracking-tight text-white">{SVCE_APP_SHORT}</p>
          <p className="truncate text-[10px] text-white/65">{SVCE_COLLEGE_NAME}</p>
        </div>
      )}
    </div>
  )
}
