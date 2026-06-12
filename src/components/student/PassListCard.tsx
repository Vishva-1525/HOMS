import { PassTypeBadge } from '@/components/student/PassTypeBadge'
import { StatusChip } from '@/components/student/StatusChip'
import { formatPassDate, formatReturnTime } from '@/lib/outpass'
import { isPassOverdue } from '@/lib/pass-filters'
import type { GateLog, OutpassRequest } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PassListCardProps {
  pass: OutpassRequest
  gateLogs: GateLog[]
  onClick: () => void
}

export function PassListCard({ pass, gateLogs, onClick }: PassListCardProps) {
  const overdue = isPassOverdue(pass, gateLogs)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'glass-panel w-full p-4 text-left transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl active:scale-[0.99]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <PassTypeBadge type={pass.pass_type} />
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {overdue && (
            <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-300">
              Overdue
            </span>
          )}
          <StatusChip status={pass.status} />
        </div>
      </div>

      <p className="mt-2 truncate font-medium">{pass.destination}</p>

      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        <p>Departs {formatReturnTime(pass.departure_at)}</p>
        <p>Returns {formatReturnTime(pass.return_by)}</p>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Requested {formatPassDate(pass.created_at)}
      </p>
    </button>
  )
}
