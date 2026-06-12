import { getStatusChipClass, STATUS_LABELS } from '@/lib/outpass'
import type { OutpassStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export function StatusChip({ status, className }: { status: OutpassStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
        getStatusChipClass(status),
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
