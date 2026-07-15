import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { StudentAvatar } from '@/components/shared/StudentAvatar'
import { StudentGreetingCard } from '@/components/student/StudentGreetingCard'
import { getSemesterLabel } from '@/hooks/useStudentDashboardData'
import type { ActiveCheckedOutPass } from '@/hooks/useStudentDashboardData'
import type { Student } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StudentDashboardHeroProps {
  firstName: string
  student: Student | null
  checkedOutPass: ActiveCheckedOutPass | null
  className?: string
}

export function StudentDashboardHero({
  firstName,
  student,
  checkedOutPass,
  className,
}: StudentDashboardHeroProps) {
  const fullName = student ? `${firstName}` : firstName

  return (
    <section
      className={cn(
        'dashboard-page-header relative mb-0 overflow-hidden p-0',
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A335C] via-[#1A5CA0] to-[#0D3F72]" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.16)_0%,transparent_50%)]"
        aria-hidden
      />
      <div className="relative z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <StudentAvatar
            name={fullName}
            size="lg"
            className="hidden border-white/30 ring-white/25 sm:flex"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#D6E6F7]">
              {getSemesterLabel()} · SVCE Hostel
            </p>
            <StudentGreetingCard
              firstName={firstName}
              student={student}
              checkedOutPass={checkedOutPass}
              variant="hero"
            />
          </div>
        </div>
        <Link
          to="/student/new-request"
          className="relative z-10 inline-flex h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-xl bg-white px-4 text-sm font-semibold text-[#0D3F72] shadow-md transition-all duration-200 hover:bg-[#EBF3FF] hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          New request
        </Link>
      </div>
    </section>
  )
}
