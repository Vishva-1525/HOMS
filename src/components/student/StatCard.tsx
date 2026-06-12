import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number
  className?: string
  valueClassName?: string
}

export function StatCard({ label, value, className, valueClassName }: StatCardProps) {
  return (
    <div className={cn('glass-panel p-4 transition-transform duration-200 hover:-translate-y-0.5', className)}>
      <p className={cn('text-2xl font-bold tabular-nums tracking-tight', valueClassName)}>{value}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}
