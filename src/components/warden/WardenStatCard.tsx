import { cn } from '@/lib/utils'

interface WardenStatCardProps {
  label: string
  value: number
  className?: string
  valueClassName?: string
}

export function WardenStatCard({ label, value, className, valueClassName }: WardenStatCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-5 shadow-sm', className)}>
      <p className={cn('text-3xl font-bold tabular-nums tracking-tight', valueClassName)}>{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
