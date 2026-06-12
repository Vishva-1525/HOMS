import { WardenStatCard } from '@/components/warden/WardenStatCard'
import { Spinner } from '@/components/ui/spinner'
import { useWardenDataContext } from '@/contexts/WardenDataContext'

export function WardenHomePage() {
  const { stats, loading, error } = useWardenDataContext()

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Spinner label="Loading dashboard..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="dashboard-page-header">
        <h1 className="dashboard-heading text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="dashboard-subheading mt-2 text-sm">
          Hostel outpass overview — updates live
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WardenStatCard
          label="Pending review"
          value={stats.pendingReview}
          valueClassName="text-amber-600"
        />
        <WardenStatCard
          label="Students currently out"
          value={stats.studentsOut}
          valueClassName="text-blue-600"
        />
        <WardenStatCard
          label="Approved today"
          value={stats.approvedToday}
          valueClassName="text-green-600"
        />
        <WardenStatCard
          label="Overdue returns"
          value={stats.overdueReturns}
          valueClassName="text-red-600"
        />
      </div>
    </div>
  )
}
