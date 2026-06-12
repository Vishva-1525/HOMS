import { cn } from '@/lib/utils'

interface WardenStatCardProps {
  label: string
  value: number
  className?: string
  valueClassName?: string
}

export function WardenStatCard({ label, value, className, valueClassName }: WardenStatCardProps) {
  return (
    <div className={cn('glass-panel p-5 transition-transform duration-200 hover:-translate-y-0.5', className)}>
      <p className={cn('text-3xl font-bold tabular-nums tracking-tight', valueClassName)}>{value}</p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  )
}
