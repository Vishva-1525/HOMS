import { StudentDashboardStatCard } from '@/components/student/StudentDashboardStats'
import type { StudentPassQuotas } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StudentPassQuotaStatsProps {
  quotas: StudentPassQuotas
}

function usageTone(used: number, limit: number): string {
  if (used >= limit) return 'text-red-700'
  if (used >= limit - 1) return 'text-amber-700'
  return 'text-[#0D3F72]'
}

export function StudentPassQuotaStats({ quotas }: StudentPassQuotaStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <StudentDashboardStatCard
        label="Weekly Passes Used"
        value={`${quotas.weekly_used} / ${quotas.weekly_limit}`}
        subtext="Used this week"
        valueClassName={cn('text-2xl sm:text-[28px]', usageTone(quotas.weekly_used, quotas.weekly_limit))}
      />
      <StudentDashboardStatCard
        label="Monthly Passes Used"
        value={`${quotas.monthly_used} / ${quotas.monthly_limit}`}
        subtext="Used this month"
        valueClassName={cn('text-2xl sm:text-[28px]', usageTone(quotas.monthly_used, quotas.monthly_limit))}
      />
    </div>
  )
}
