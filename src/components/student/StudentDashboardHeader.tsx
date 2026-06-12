import { cn } from '@/lib/utils'

interface StudentDashboardHeaderProps {
  className?: string
}

export function StudentDashboardHeader({ className }: StudentDashboardHeaderProps) {
  return (
    <div className={cn(className)}>
      <h1 className="text-xl font-semibold text-[#1A1A2E] md:text-2xl">Dashboard</h1>
    </div>
  )
}
