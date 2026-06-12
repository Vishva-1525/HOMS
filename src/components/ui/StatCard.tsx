import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatCardTrend {
  value: string
  direction: 'up' | 'down'
}

export type StatCardIconTone = 'amber' | 'blue' | 'green' | 'red' | 'default'

const ICON_TONE_STYLES: Record<
  StatCardIconTone,
  { bg: string; icon: string }
> = {
  default: {
    bg: 'bg-[var(--svce-blue-tint)]',
    icon: 'text-[var(--svce-primary-blue)]',
  },
  amber: { bg: 'bg-[#FFF8E1]', icon: 'text-[#D97706]' },
  blue: { bg: 'bg-[#EBF3FF]', icon: 'text-[#1A5CA0]' },
  green: { bg: 'bg-[var(--svce-green-tint)]', icon: 'text-[#166534]' },
  red: { bg: 'bg-[#FEF2F2]', icon: 'text-[#DC2626]' },
}

export interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: LucideIcon
  iconTone?: StatCardIconTone
  iconPulse?: boolean
  trend?: StatCardTrend
  className?: string
  valueClassName?: string
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconTone = 'default',
  iconPulse = false,
  trend,
  className,
  valueClassName,
}: StatCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown
  const iconStyles = ICON_TONE_STYLES[iconTone]

  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--svce-border-default)] bg-[var(--svce-white)] p-[var(--card-padding)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[length:var(--svce-text-small)] text-[var(--svce-text-muted)]">{label}</p>
          <p
            className={cn(
              'mt-1 text-[28px] font-semibold leading-tight tabular-nums text-[var(--svce-text-primary)]',
              valueClassName,
            )}
          >
            {value}
          </p>
          {subtext && (
            <p className="mt-1 text-[length:var(--svce-text-small)] text-[var(--svce-text-secondary)]">
              {subtext}
            </p>
          )}
          {trend && (
            <span
              className={cn(
                'mt-2 inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5 text-[length:var(--svce-text-small)] font-medium',
                trend.direction === 'up'
                  ? 'bg-[var(--svce-green-tint)] text-[#166534]'
                  : 'bg-[var(--svce-danger-tint)] text-[#991B1B]',
              )}
            >
              <TrendIcon className="h-3 w-3" strokeWidth={2} />
              {trend.value}
            </span>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              iconStyles.bg,
            )}
          >
            {iconPulse && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#DC2626] opacity-40" />
            )}
            <Icon className={cn('relative h-5 w-5', iconStyles.icon)} strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  )
}
