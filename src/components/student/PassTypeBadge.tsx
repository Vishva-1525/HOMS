import { PASS_TYPE_LABELS } from '@/lib/outpass'
import type { PassType } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PassTypeBadge({ type, className }: { type: PassType; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground',
        className,
      )}
    >
      {PASS_TYPE_LABELS[type]}
    </span>
  )
}
