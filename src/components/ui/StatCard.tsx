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
  amber: { bg: 'bg-[var(--svce-warning-tint)]', icon: 'text-[var(--svce-warning)]' },
  blue: { bg: 'bg-[var(--svce-blue-tint)]', icon: 'text-[var(--svce-primary-blue)]' },
  green: { bg: 'bg-[var(--svce-green-tint)]', icon: 'text-[var(--svce-accent-green)]' },
  red: { bg: 'bg-[var(--svce-danger-tint)]', icon: 'text-[var(--svce-danger)]' },
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
    <div className={cn('glass-panel relative overflow-hidden p-[var(--card-padding)]', className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1A5CA0]/0 via-[#1A5CA0]/30 to-[#1A5CA0]/0" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[length:var(--svce-text-small)] font-medium text-[var(--svce-text-secondary)]">{label}</p>
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
              iconPulse &&
                (iconTone === 'red'
                  ? 'ring-2 ring-[var(--svce-danger)]/45 ring-offset-2 ring-offset-transparent'
                  : iconTone === 'amber'
                    ? 'ring-2 ring-[var(--svce-warning)]/40 ring-offset-2 ring-offset-transparent'
                    : 'ring-2 ring-[var(--svce-primary-blue)]/35 ring-offset-2 ring-offset-transparent'),
            )}
          >
            <Icon className={cn('relative h-5 w-5', iconStyles.icon)} strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  )
}
