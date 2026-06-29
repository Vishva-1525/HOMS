import { useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { Spinner } from '@/components/ui/spinner'
import { usePassPeriodStats } from '@/hooks/usePassPeriodStats'
import type { PassStatsPeriod } from '@/lib/pass-period-stats'
import { cn } from '@/lib/utils'

const PERIOD_TABS: { id: PassStatsPeriod; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

interface PassPeriodStatsPanelProps {
  title?: string
  className?: string
}

export function PassPeriodStatsPanel({
  title = 'Pass statistics',
  className,
}: PassPeriodStatsPanelProps) {
  const [period, setPeriod] = useState<PassStatsPeriod>('weekly')
  const { stats, loading, error } = usePassPeriodStats(period)

  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="dashboard-heading text-sm font-semibold">{title}</h2>
        <div className="flex flex-wrap gap-2">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                period === tab.id
                  ? 'bg-[#1A5CA0] text-white'
                  : 'bg-white/60 text-slate-700 hover:bg-white/80',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center">
          <Spinner label="Loading statistics…" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Pending" value={stats.pending} icon={Clock} iconTone="amber" />
          <StatCard label="Approved" value={stats.approved} icon={CheckCircle} iconTone="green" />
          <StatCard label="Rejected" value={stats.rejected} icon={XCircle} iconTone="red" />
          <StatCard
            label="Overdue"
            value={stats.overdue}
            icon={AlertTriangle}
            iconTone="red"
            iconPulse={stats.overdue > 0}
          />
        </div>
      )}
    </section>
  )
}
