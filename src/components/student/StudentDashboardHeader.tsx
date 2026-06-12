import { cn } from '@/lib/utils'

interface StudentDashboardHeaderProps {
  className?: string
}

export function StudentDashboardHeader({ className }: StudentDashboardHeaderProps) {
  return (
    <div className={cn('dashboard-page-header', className)}>
      <h1 className="dashboard-heading text-xl md:text-2xl">Dashboard</h1>
      <p className="dashboard-subheading mt-1.5 text-sm">Your hostel outpass overview</p>
    </div>
  )
}
