import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Clock,
  FileText,
  LogOut,
  Users,
} from 'lucide-react'
import { AdminActivityFeed } from '@/components/admin/AdminActivityFeed'
import { PassPeriodStatsPanel } from '@/components/shared/PassPeriodStatsPanel'
import { StatCard } from '@/components/ui/StatCard'
import { Spinner } from '@/components/ui/spinner'
import { useAdminStats } from '@/hooks/admin/useAdminStats'
import { usePassLimitViolations } from '@/hooks/usePassLimitViolations'

export function AdminDashboard() {
  const { stats, loading, error } = useAdminStats()
  const { violations, loading: violationsLoading } = usePassLimitViolations()
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
          System overview and live activity
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
          Overview
        </h2>
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
            valueClassName={stats.overdue_returns > 0 ? 'text-[#DC2626]' : undefined}
            className={
              stats.overdue_returns > 0
                ? 'border-[#FECACA]/80 bg-gradient-to-br from-[#FEF2F2]/90 to-white'
                : undefined
            }
          />
          <StatCard
            label="Pending warden approval"
            value={stats.pending_approval}
            icon={Clock}
            iconTone="amber"
            iconPulse={stats.pending_approval > 0}
            valueClassName={stats.pending_approval > 0 ? 'text-[#D97706]' : undefined}
          />
          <StatCard
            label="Total passes this month"
            value={stats.passes_this_month}
            icon={FileText}
            iconTone="default"
          />
        </div>
      </section>

      <PassPeriodStatsPanel title="Pass statistics" />

      {!violationsLoading && violations.length > 0 && (
        <section className="dashboard-surface-muted space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="dashboard-section-heading">
              <span className="dashboard-section-accent" aria-hidden />
              Pass limit warnings
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-0.5 text-xs font-semibold text-[#991B1B]">
              <AlertTriangle className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              {violations.length} student{violations.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="divide-y divide-slate-200/60 overflow-hidden rounded-xl border border-white/55 bg-white/40">
            {violations.slice(0, 8).map((v) => (
              <li
                key={v.student_id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <button
                  type="button"
                  className="text-left text-sm font-medium text-[#0D3F72] hover:underline"
                  onClick={() => navigate(`/admin/students?student=${v.student_id}`)}
                >
                  {v.student_name} · {v.reg_number}
                </button>
                <span className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Weekly</span> {v.weekly_used}/
                  {v.weekly_limit}
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="font-medium text-slate-700">Monthly</span> {v.monthly_used}/
                  {v.monthly_limit}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdminActivityFeed
        onStudentClick={(studentId) => {
          navigate(`/admin/students?student=${studentId}`)
        }}
      />
    </div>
  )
}
