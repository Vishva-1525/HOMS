import { cn } from '@/lib/utils'

interface StudentDashboardHeaderProps {
  className?: string
}

export function StudentDashboardHeader({ className }: StudentDashboardHeaderProps) {
  return (
    <div className={cn('dashboard-page-header mb-0', className)}>
      <h1 className="dashboard-heading text-xl md:text-2xl">Dashboard</h1>
    </div>
  )
}
