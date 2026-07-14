import { getGreeting, formatReturnTime } from '@/lib/outpass'
import type { ActiveCheckedOutPass } from '@/hooks/useStudentDashboardData'
import type { Student } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StudentGreetingCardProps {
  firstName: string
  student: Student | null
  checkedOutPass: ActiveCheckedOutPass | null
  variant?: 'card' | 'hero'
}

export function StudentGreetingCard({
  firstName,
  student,
  checkedOutPass,
  variant = 'card',
}: StudentGreetingCardProps) {
  if (variant === 'hero') {
    return (
      <div className="text-white">
        <p className="mt-1 text-[22px] font-semibold leading-snug tracking-tight sm:text-2xl">
          {getGreeting()}, {firstName}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-[#E4EEF8]">
          <span>{student?.reg_number ?? '—'}</span>
          <span>
            Room {student?.room_number ?? '—'}
            {student?.hostel_block ? ` · ${student.hostel_block}` : ''}
          </span>
        </div>
        {checkedOutPass && (
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-white">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span>
              Currently outside · Return by {formatReturnTime(checkedOutPass.return_by)}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl bg-[#0D3F72] p-4 text-white shadow-md')}>
      <p className="text-[20px] font-semibold leading-snug tracking-tight">
        {getGreeting()}, {firstName}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-[#E4EEF8]">
        <span>{student?.reg_number ?? '—'}</span>
        <span>
          Room {student?.room_number ?? '—'}
          {student?.hostel_block ? ` · ${student.hostel_block}` : ''}
        </span>
      </div>

      {checkedOutPass && (
        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-white">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span>
            Currently outside · Return by {formatReturnTime(checkedOutPass.return_by)}
          </span>
        </div>
      )}
    </div>
  )
}
