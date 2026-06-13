import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react'
import { ParentAlertsList, ParentStatusBanner, ParentWardHeader } from '@/components/parent/ParentWardPanels'
import { ParentPassTable } from '@/components/parent/ParentPassTable'
import { StatCard } from '@/components/ui/StatCard'
import { Spinner } from '@/components/ui/spinner'
import { useParentData } from '@/hooks/parent/useParentData'

export function ParentDashboard() {
  const {
    wards,
    activeWard,
    passes,
    gateLogs,
    wardStatus,
    alerts,
    stats,
    loading,
    error,
    selectWard,
  } = useParentData()

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading parent dashboard…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    )
  }

  if (!activeWard) {
    return (
      <div className="glass-panel-strong p-6">
        <h1 className="dashboard-heading text-xl font-semibold">Parent Dashboard</h1>
        <p className="dashboard-subheading mt-2 text-sm">
          No ward linked to your account yet. Ensure your phone or email matches the parent contact
          on your child&apos;s hostel record.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-page-header">
        <h1 className="dashboard-heading text-xl md:text-2xl">Parent Dashboard</h1>
        <p className="dashboard-subheading mt-1.5 text-sm">
          Live status and notifications for your ward&apos;s hostel outpass activity
        </p>
      </div>

      <ParentWardHeader ward={activeWard} wards={wards} onSelectWard={selectWard} />

      <ParentStatusBanner status={wardStatus} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total passes"
          value={stats.total}
          icon={FileText}
          iconTone="blue"
        />
        <StatCard
          label="Pending approval"
          value={stats.pending}
          icon={Clock}
          iconTone="amber"
          iconPulse={stats.pending > 0}
        />
        <StatCard
          label="Active / approved"
          value={stats.approved}
          icon={CheckCircle2}
          iconTone="green"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          iconTone="red"
          iconPulse={stats.overdue > 0}
          valueClassName={stats.overdue > 0 ? 'text-red-700' : undefined}
        />
      </div>

      <ParentAlertsList alerts={alerts} />

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="dashboard-heading text-sm font-semibold">Recent passes</h2>
          <Link to="/parent/history" className="dashboard-link text-xs underline-offset-4">
            View full history
          </Link>
        </div>
        <ParentPassTable
          passes={passes}
          gateLogs={gateLogs}
          title="Recent activity"
          limit={8}
          emptyMessage="No pass requests yet."
        />
      </div>
    </div>
  )
}
