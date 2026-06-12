import { SVCE_COLLEGE_NAME, SVCE_EMBLEM_URL } from '@/lib/branding'
import { cn } from '@/lib/utils'

const SIZE_CLASSES = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
} as const

interface SvceEmblemProps {
  size?: keyof typeof SIZE_CLASSES
  className?: string
  withRing?: boolean
}

export function SvceEmblem({ size = 'md', className, withRing = false }: SvceEmblemProps) {
  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-full bg-white',
        withRing && 'ring-2 ring-white/70 shadow-lg shadow-slate-900/15',
        SIZE_CLASSES[size],
        className,
      )}
    >
      <img
        src={SVCE_EMBLEM_URL}
        alt={SVCE_COLLEGE_NAME}
        className="h-full w-full object-cover"
      />
    </div>
  )
}
