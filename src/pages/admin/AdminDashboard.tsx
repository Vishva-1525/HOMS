import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Clock,
  FileText,
  LogOut,
  Users,
} from 'lucide-react'
import { AdminActivityFeed } from '@/components/admin/AdminActivityFeed'
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
    <div className="space-y-6">
      <div className="dashboard-page-header">
        <h1 className="dashboard-heading text-xl md:text-2xl">Admin Dashboard</h1>
        <p className="dashboard-subheading mt-1.5 text-sm">System overview and live activity</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total students" value={stats.total_students} icon={Users} iconTone="blue" />
        <StatCard
          label="Active outpasses now"
          value={stats.active_outpasses}
          icon={FileText}
          iconTone="green"
        />
        <StatCard
          label="Currently outside hostel"
          value={stats.currently_outside}
          icon={LogOut}
          iconTone="blue"
        />
        <StatCard
          label="Overdue returns"
          value={stats.overdue_returns}
          icon={AlertTriangle}
          iconTone="red"
          iconPulse={stats.overdue_returns > 0}
        />
        <StatCard
          label="Pending warden approval"
          value={stats.pending_approval}
          icon={Clock}
          iconTone="amber"
          iconPulse={stats.pending_approval > 0}
        />
        <StatCard
          label="Total passes this month"
          value={stats.passes_this_month}
          icon={FileText}
          iconTone="default"
        />
      </div>

      <AdminActivityFeed
        onStudentClick={(studentId) => {
          navigate(`/admin/students?student=${studentId}`)
        }}
      />
    </div>
  )
}
