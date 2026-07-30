import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  LogOut,
} from 'lucide-react'
import { AdminActivityFeed } from '@/components/admin/AdminActivityFeed'
import { PassPeriodStatsPanel } from '@/components/shared/PassPeriodStatsPanel'
import { StatCard } from '@/components/ui/StatCard'
import { Spinner } from '@/components/ui/spinner'
import { useAdminStats } from '@/hooks/admin/useAdminStats'

export function AdminDashboard() {
  const { stats, loading, error } = useAdminStats()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading admin dashboard…" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="dashboard-page-header">
        <h1 className="dashboard-heading text-2xl md:text-3xl">Admin Dashboard</h1>
        <p className="dashboard-subheading mt-1.5 text-sm sm:text-[15px]">
          Real-time operations and historical analytics
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="dashboard-section">
        <h2 className="dashboard-section-heading">
          <span className="dashboard-section-accent" aria-hidden />
          Real-Time
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Pending review"
            value={stats.pending_approval}
            icon={Clock}
            iconTone="amber"
            iconPulse={stats.pending_approval > 0}
            valueClassName={stats.pending_approval > 0 ? 'text-[#D97706]' : undefined}
          />
          <StatCard
            label="Currently out"
            value={stats.currently_outside}
            icon={LogOut}
            iconTone="blue"
          />
          <StatCard
            label="Approved today"
            value={stats.approved_today}
            icon={CheckCircle}
            iconTone="green"
          />
          <StatCard
            label="Overdue"
            value={stats.overdue_returns}
            icon={AlertTriangle}
            iconTone="red"
            iconPulse={stats.overdue_returns > 0}
            valueClassName={stats.overdue_returns > 0 ? 'text-[#DC2626]' : undefined}
            className={
              stats.overdue_returns > 0
                ? 'border-[#FECACA]/80 bg-gradient-to-br from-[#FEF2F2]/90 to-white'
                : undefined
            }
          />
        </div>
      </section>

      <PassPeriodStatsPanel
        title="Analytics"
        variant="analytics"
      />

      <AdminActivityFeed
        onStudentClick={(studentId) => {
          navigate(`/admin/students?student=${studentId}`)
        }}
      />
    </div>
  )
}
