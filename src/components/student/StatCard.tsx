import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number
  className?: string
  valueClassName?: string
}

export function StatCard({ label, value, className, valueClassName }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-4 shadow-sm', className)}>
      <p className={cn('text-2xl font-bold tabular-nums tracking-tight', valueClassName)}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
