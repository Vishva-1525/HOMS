import { Check, Circle, Loader } from 'lucide-react'
import {
  buildCheckpointProgress,
  type CheckpointProgressItem,
} from '@/lib/gate-checkpoints'
import type { GateLog } from '@/lib/types'
import { cn } from '@/lib/utils'

interface GateCheckpointProgressProps {
  passId: string
  gateLogs: GateLog[]
  multiDaily?: boolean
  compact?: boolean
  className?: string
}

function StatusIcon({ status }: { status: CheckpointProgressItem['status'] }) {
  if (status === 'done') {
    return <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} aria-hidden />
  }
  if (status === 'current') {
    return <Loader className="h-4 w-4 animate-spin text-[#1A5CA0]" strokeWidth={2} aria-hidden />
  }
  return <Circle className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} aria-hidden />
}

export function GateCheckpointProgress({
  passId,
  gateLogs,
  multiDaily = false,
  compact = false,
  className,
}: GateCheckpointProgressProps) {
  const items = buildCheckpointProgress(passId, gateLogs, { multiDaily })

  return (
    <div className={cn('space-y-2', className)}>
      <ul className={cn('space-y-1.5', compact && 'space-y-1')}>
        {items.map((item) => (
          <li
            key={item.checkpoint}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm',
              item.status === 'done' && 'bg-emerald-50 text-emerald-900',
              item.status === 'current' && 'bg-[#EBF3FF] font-semibold text-[#0D3F72] ring-1 ring-[#1A5CA0]/30',
              item.status === 'pending' && 'text-slate-500',
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
              <StatusIcon status={item.status} />
            </span>
            <span className="min-w-0 flex-1">{item.label}</span>
            {item.status === 'current' && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#1A5CA0]">
                Next
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
