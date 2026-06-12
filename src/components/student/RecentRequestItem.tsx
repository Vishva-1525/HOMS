import { formatPassDate } from '@/lib/outpass'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import type { GateLog, OutpassRequest } from '@/lib/types'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'

interface RecentRequestItemProps {
  pass: OutpassRequest
  gateLogs?: GateLog[]
  onClick: () => void
}

export function RecentRequestItem({ pass, gateLogs = [], onClick }: RecentRequestItemProps) {
  const displayStatus = getPassDisplayStatus(pass, gateLogs)
  const label = getPassStatusLabel(pass.status, gateLogs, pass)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border border-[var(--svce-border-default)] bg-white p-3 text-left transition-colors',
        'active:bg-[var(--svce-page-bg)]',
      )}
    >
      <PassTypeBadge type={pass.pass_type} />
      <span className="min-w-0 flex-1 truncate text-sm text-[#1A1A2E]">{pass.destination}</span>
      <span className="shrink-0 text-xs text-[var(--svce-text-muted)]">
        {formatPassDate(pass.created_at)}
      </span>
      <StatusBadge status={displayStatus} label={label} className="shrink-0" />
    </button>
  )
}
