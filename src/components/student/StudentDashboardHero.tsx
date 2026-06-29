import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { StudentAvatar } from '@/components/shared/StudentAvatar'
import { StudentGreetingCard } from '@/components/student/StudentGreetingCard'
import { SVCE_EMBLEM_URL } from '@/lib/branding'
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
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D3F72] via-[#1A5CA0] to-[#0D3F72]/95" />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `url('${SVCE_EMBLEM_URL}')`,
          backgroundPosition: 'right 1.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'clamp(5rem, 18vw, 8rem)',
        }}
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
            <p className="text-xs font-medium uppercase tracking-wider text-[#B3CCE8]">
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
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-xl bg-white px-4 text-sm font-semibold text-[#0D3F72] shadow-md transition-colors hover:bg-[#EBF3FF]"
        >
          <Plus className="h-4 w-4" />
          New request
        </Link>
      </div>
    </section>
  )
}
