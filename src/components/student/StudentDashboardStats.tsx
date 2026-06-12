import { cn } from '@/lib/utils'

interface StudentDashboardStatCardProps {
  label: string
  value: number
  subtext: string
  valueClassName?: string
}

export function StudentDashboardStatCard({
  label,
  value,
  subtext,
  valueClassName,
}: StudentDashboardStatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--svce-border-default)] bg-white p-4 shadow-sm">
      <p className="text-xs text-[var(--svce-text-muted)]">{label}</p>
      <p
        className={cn(
          'mt-1 text-[28px] font-semibold leading-none tabular-nums text-[#1A1A2E]',
          valueClassName,
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs text-[var(--svce-text-secondary)]">{subtext}</p>
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
      <StudentDashboardStatCard label="Total Outpasses" value={total} subtext="this semester" />
      <StudentDashboardStatCard
        label="Approved"
        value={approved}
        subtext="passes"
        valueClassName="text-[#166534]"
      />
      <StudentDashboardStatCard
        label="Pending"
        value={pending}
        subtext="awaiting approval"
        valueClassName="text-[#D97706]"
      />
      <StudentDashboardStatCard
        label="Rejected"
        value={rejected}
        subtext="passes"
        valueClassName="text-[#DC2626]"
      />
    </div>
  )
}
