import { getGreeting, formatReturnTime } from '@/lib/outpass'
import type { ActiveCheckedOutPass } from '@/hooks/useStudentDashboardData'
import type { Student } from '@/lib/types'

interface StudentGreetingCardProps {
  firstName: string
  student: Student | null
  checkedOutPass: ActiveCheckedOutPass | null
}

export function StudentGreetingCard({
  firstName,
  student,
  checkedOutPass,
}: StudentGreetingCardProps) {
  return (
    <div className="rounded-xl bg-[#0D3F72] p-4 text-white">
      <p className="text-[20px] font-semibold leading-snug">
        {getGreeting()}, {firstName}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#B3CCE8]">
        <span>{student?.reg_number ?? '—'}</span>
        <span>
          Room {student?.room_number ?? '—'}
          {student?.hostel_block ? ` · ${student.hostel_block}` : ''}
        </span>
      </div>

      {checkedOutPass && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[#EBF3FF]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2E8B44] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2E8B44]" />
          </span>
          <span>
            Currently outside · Return by {formatReturnTime(checkedOutPass.return_by)}
          </span>
        </div>
      )}
    </div>
  )
}
