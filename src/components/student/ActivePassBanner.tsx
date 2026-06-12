import { IconMapPin } from '@tabler/icons-react'
import { useCountdown } from '@/hooks/useCountdown'
import { formatReturnTime } from '@/lib/outpass'
import type { OutpassRequest } from '@/lib/types'

export function ActivePassBanner({ pass }: { pass: OutpassRequest }) {
  const countdown = useCountdown(pass.return_by)

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 p-4 text-white shadow-xl shadow-emerald-900/25 ring-1 ring-white/20">
      <p className="text-xs font-semibold uppercase tracking-wider text-green-100">
        Active Pass — Checked Out
      </p>
      <div className="mt-2 flex items-start gap-2">
        <IconMapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-100" stroke={1.75} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{pass.destination}</p>
          <p className="mt-0.5 text-sm text-green-100">
            Return by {formatReturnTime(pass.return_by)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-green-700/50 px-3 py-2">
        <span className="text-xs text-green-100">Time remaining</span>
        <span className="font-mono text-lg font-bold tabular-nums tracking-wider">{countdown}</span>
      </div>
    </div>
  )
}
