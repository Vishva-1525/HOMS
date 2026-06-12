import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'glass-panel flex flex-col items-center justify-center px-4 py-12 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF3FF]/90">
        <Icon className="h-6 w-6 text-[#0D3F72]" strokeWidth={1.75} />
      </div>
      <h3 className="dashboard-heading mt-4 text-base font-semibold">{title}</h3>
      {description && (
        <p className="dashboard-subheading mt-1 max-w-sm text-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
