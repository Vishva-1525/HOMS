import { cn } from '@/lib/utils'

interface StudentDashboardStatCardProps {
  label: string
  value: number | string
  valueClassName?: string
}

export function StudentDashboardStatCard({
  label,
  value,
  valueClassName,
}: StudentDashboardStatCardProps) {
  return (
    <div className="glass-panel relative overflow-hidden p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1A5CA0]/0 via-[#1A5CA0]/35 to-[#1A5CA0]/0" />
      <p className="dashboard-muted text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p
        className={cn(
          'mt-1.5 text-[28px] font-semibold leading-none tabular-nums tracking-tight text-slate-950',
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  )
}

interface StudentDashboardStatsProps {
  total: number
  approved: number
  pending: number
  rejected: number
}

export function StudentDashboardStats({
  total,
  approved,
  pending,
  rejected,
}: StudentDashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StudentDashboardStatCard label="Total Outpasses" value={total} />
      <StudentDashboardStatCard
        label="Approved"
        value={approved}
        valueClassName="text-emerald-700"
      />
      <StudentDashboardStatCard
        label="Pending"
        value={pending}
        valueClassName="text-amber-700"
      />
      <StudentDashboardStatCard
        label="Rejected"
        value={rejected}
        valueClassName="text-red-700"
      />
    </div>
  )
}
