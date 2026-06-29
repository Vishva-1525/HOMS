import { PASS_TYPE_LABELS } from '@/lib/outpass'
import type { PassType } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface PassTypeBadgeProps {
  type: PassType
  className?: string
}

const PASS_TYPE_STYLES: Record<PassType, string> = {
  outpass: 'bg-[var(--svce-blue-tint)] text-[var(--svce-primary-blue)]',
  staypass: 'bg-[var(--svce-orange-tint)] text-[#9A3412]',
  night_pass: 'bg-[#F3E8FF] text-[#6B21A8]',
  special_pass: 'bg-[#E0F2FE] text-[#0369A1]',
}

export function PassTypeBadge({ type, className }: PassTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-[var(--radius-full)] px-2.5 py-1 text-[length:var(--svce-text-small)] font-medium',
        PASS_TYPE_STYLES[type],
        className,
      )}
    >
      {PASS_TYPE_LABELS[type]}
    </span>
  )
}
