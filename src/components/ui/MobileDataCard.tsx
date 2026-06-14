import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileDataCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function MobileDataCard({ children, className, onClick }: MobileDataCardProps) {
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full border-b border-slate-200/70 px-4 py-3.5 text-left last:border-0',
        onClick && 'transition-colors active:bg-slate-50/80',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

export function MobileDataCardRow({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 text-sm', className)}>
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}
