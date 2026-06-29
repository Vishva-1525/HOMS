import { cn } from '@/lib/utils'

interface PassLimitBadgeProps {
  weeklyExceeded?: boolean
  monthlyExceeded?: boolean
  className?: string
}

export function PassLimitBadge({
  weeklyExceeded,
  monthlyExceeded,
  className,
}: PassLimitBadgeProps) {
  if (!weeklyExceeded && !monthlyExceeded) return null

  const label = weeklyExceeded && monthlyExceeded
    ? 'Limit exceeded'
    : weeklyExceeded
      ? 'Weekly limit'
      : 'Monthly limit'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#991B1B]',
        className,
      )}
      title="Student has exceeded pass limits"
    >
      {label}
    </span>
  )
}
