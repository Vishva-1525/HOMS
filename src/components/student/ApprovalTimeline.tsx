import { buildApprovalTimeline } from '@/lib/approval-timeline'
import type { GateLog, OutpassRequest } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ApprovalTimelineProps {
  pass: OutpassRequest
  gateLogs?: GateLog[]
  className?: string
}

const STATE_STYLES = {
  completed: {
    dot: 'bg-[#1A5CA0]',
    text: 'text-slate-900',
    sub: 'text-slate-600',
  },
  current: {
    dot: 'bg-[#D97706] ring-4 ring-[#FEF3C7]',
    text: 'text-slate-900 font-semibold',
    sub: 'text-[#92400E]',
  },
  pending: {
    dot: 'bg-slate-300',
    text: 'text-slate-500',
    sub: 'text-slate-400',
  },
} as const

export function ApprovalTimeline({ pass, gateLogs = [], className }: ApprovalTimelineProps) {
  const stages = buildApprovalTimeline(pass, gateLogs)

  return (
    <div className={cn('mt-4', className)}>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-600">Approval timeline</p>
      <ol className="space-y-3 border-l-2 border-[#EBF3FF] pl-4">
        {stages.map((stage) => {
          const styles = STATE_STYLES[stage.state]
          return (
            <li key={stage.id} className="relative text-sm">
              <span
                className={cn(
                  'absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full',
                  styles.dot,
                )}
              />
              <p className={cn(styles.text)}>{stage.label}</p>
              <p className={cn('text-xs capitalize', styles.sub)}>
                {stage.state}
                {stage.detail ? ` · ${stage.detail}` : ''}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
