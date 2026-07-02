import { useEffect, useMemo, useState } from 'react'
import { ActivePassBanner } from '@/components/student/ActivePassBanner'
import { ExtensionRequestBanner } from '@/components/student/ExtensionRequestBanner'
import { PassDetailSheet } from '@/components/student/PassDetailSheet'
import { StudentDashboardHero } from '@/components/student/StudentDashboardHero'
import { StudentDashboardStats } from '@/components/student/StudentDashboardStats'
import { StudentPassQuotaStats } from '@/components/student/StudentPassQuotaStats'
import { StudentRecentRequestsTable } from '@/components/student/StudentRecentRequestsTable'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthProvider'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { useStudentPassQuotas } from '@/hooks/useStudentPassQuotas'
import { useStudentPasses } from '@/hooks/useStudentPasses'
import { canRequestExtension } from '@/lib/pass-filters'
import type { OutpassRequest } from '@/lib/types'

export function StudentHomePage() {
  const { profile } = useAuth()
  const dashboard = useStudentDashboardData()
  const { quotas, loading: quotasLoading } = useStudentPassQuotas()
  const { passes, extensions, gateLogs, refetch } = useStudentPasses()
  const [selectedPass, setSelectedPass] = useState<OutpassRequest | null>(null)
  const [detailInitialAction, setDetailInitialAction] = useState<'extension' | undefined>()

  const firstName = profile?.full_name?.split(/\s+/)[0] ?? 'Student'

  const approvedPasses = useMemo(
    () => passes.filter((pass) => pass.status === 'approved' || pass.status === 'extended'),
    [passes],
  )

  const extensionEligiblePass = useMemo(() => {
    const active = dashboard.activePass ?? dashboard.activeCheckedOutPass
    if (!active || !canRequestExtension(active, gateLogs)) return null
    const hasPending = extensions.some(
      (e) => e.outpass_id === active.id && e.status === 'pending',
    )
    return hasPending ? null : active
  }, [dashboard.activePass, dashboard.activeCheckedOutPass, gateLogs, extensions])

  useEffect(() => {
    if (!selectedPass) return
    const updated = dashboard.recentPasses.find((p) => p.id === selectedPass.id)
      ?? dashboard.semesterPasses.find((p) => p.id === selectedPass.id)
    if (updated) setSelectedPass(updated)
  }, [dashboard.recentPasses, dashboard.semesterPasses, selectedPass])

  if (dashboard.loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading dashboard…" />
      </div>
    )
  }

  if (dashboard.error) {
    return (
      <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
        {dashboard.error}
      </div>
    )
  }

  const missingStudentRecord = !dashboard.student

  return (
    <div className="space-y-6 sm:space-y-8">
      {missingStudentRecord && (
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFF8E1] px-4 py-3 text-sm text-[#92400E]">
          Your hostel student profile is not set up yet. You can still view passes, but contact the
          warden office to complete registration.
        </div>
      )}

      <StudentDashboardHero
        firstName={firstName}
        student={dashboard.student}
        checkedOutPass={dashboard.activeCheckedOutPass}
      />

      {dashboard.activePass && (
        <ActivePassBanner
          pass={dashboard.activePass}
          student={dashboard.student}
          quotas={quotas}
          approvedPasses={approvedPasses}
        />
      )}

      {extensionEligiblePass && (
        <ExtensionRequestBanner
          pass={extensionEligiblePass}
          onRequestExtension={() => {
            setDetailInitialAction('extension')
            setSelectedPass(extensionEligiblePass)
          }}
        />
      )}

      <section className="dashboard-section">
        <h2 className="dashboard-section-heading">
          <span className="dashboard-section-accent" aria-hidden />
          Pass usage
        </h2>
        {quotasLoading ? (
          <div className="dashboard-loading-panel min-h-[120px]">
            <Spinner label="Loading pass usage…" />
          </div>
        ) : (
          <StudentPassQuotaStats quotas={quotas} />
        )}
      </section>

      <section className="dashboard-section">
        <h2 className="dashboard-section-heading">
          <span className="dashboard-section-accent" aria-hidden />
          This semester
        </h2>
        <StudentDashboardStats
          total={dashboard.stats.total}
          approved={dashboard.stats.approved}
          pending={dashboard.stats.pending}
          rejected={dashboard.stats.rejected}
        />
      </section>

      <section className="dashboard-section">
        <StudentRecentRequestsTable
          passes={dashboard.recentPasses}
          gateLogs={gateLogs}
          onSelectPass={setSelectedPass}
        />
      </section>

      <PassDetailSheet
        pass={selectedPass}
        student={dashboard.student}
        extensions={extensions}
        gateLogs={gateLogs}
        quotas={quotas}
        approvedPasses={approvedPasses}
        initialAction={detailInitialAction}
        onClose={() => {
          setSelectedPass(null)
          setDetailInitialAction(undefined)
        }}
        onUpdated={refetch}
      />
    </div>
  )
}
