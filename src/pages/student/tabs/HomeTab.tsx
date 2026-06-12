import { ActivePassBanner } from '@/components/student/ActivePassBanner'
import { RecentRequestItem } from '@/components/student/RecentRequestItem'
import { StatCard } from '@/components/student/StatCard'
import { Spinner } from '@/components/ui/spinner'
import { getSemesterLabel, type useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { getGreeting } from '@/lib/outpass'
import { useAuth } from '@/contexts/AuthProvider'

type HomeTabProps = ReturnType<typeof useStudentDashboardData>

export function HomeTab({
  student,
  stats,
  recentPasses,
  activeCheckedOutPass,
  loading,
  error,
}: HomeTabProps) {
  const { profile } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading dashboard..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  const semesterLabel = getSemesterLabel()

  return (
    <div className="space-y-5">
      <div className="glass-panel-strong p-5">
        <p className="text-sm font-medium text-muted-foreground">{getGreeting()},</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {profile?.full_name || 'Student'}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="rounded-full bg-white/45 px-2.5 py-0.5 ring-1 ring-white/50">
            {student?.reg_number ?? '—'}
          </span>
          <span className="rounded-full bg-white/45 px-2.5 py-0.5 ring-1 ring-white/50">
            Room {student?.room_number ?? '—'}
            {student?.hostel_block ? ` · ${student.hostel_block}` : ''}
          </span>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          This Semester ({semesterLabel})
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Passes" value={stats.total} />
          <StatCard
            label="Approved"
            value={stats.approved}
            valueClassName="text-green-600 dark:text-green-400"
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            valueClassName="text-amber-600 dark:text-amber-400"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            valueClassName="text-red-600 dark:text-red-400"
          />
        </div>
      </div>

      {activeCheckedOutPass && <ActivePassBanner pass={activeCheckedOutPass} />}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Requests</h2>
        {recentPasses.length === 0 ? (
          <div className="glass-panel border-dashed p-6 text-center text-sm text-muted-foreground">
            No outpass requests yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recentPasses.map((pass) => (
              <RecentRequestItem key={pass.id} pass={pass} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
