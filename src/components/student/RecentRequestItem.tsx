import { formatPassDate } from '@/lib/outpass'
import type { OutpassRequest } from '@/lib/types'
import { PassTypeBadge } from '@/components/student/PassTypeBadge'
import { StatusChip } from '@/components/student/StatusChip'

export function RecentRequestItem({ pass }: { pass: OutpassRequest }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <PassTypeBadge type={pass.pass_type} />
          <StatusChip status={pass.status} />
        </div>
        <p className="truncate text-sm font-medium">{pass.destination}</p>
        <p className="text-xs text-muted-foreground">{formatPassDate(pass.created_at)}</p>
      </div>
    </div>
  )
}
