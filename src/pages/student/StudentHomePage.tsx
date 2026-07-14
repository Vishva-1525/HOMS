import { useEffect, useMemo, useState } from 'react'
import { ActivePassBanner } from '@/components/student/ActivePassBanner'
import { ExtensionRequestBanner } from '@/components/student/ExtensionRequestBanner'
import { PassDetailSheet } from '@/components/student/PassDetailSheet'
import { StudentDashboardHero } from '@/components/student/StudentDashboardHero'
import { StudentDashboardStats } from '@/components/student/StudentDashboardStats'
import { StudentPassQuotaStats } from '@/components/student/StudentPassQuotaStats'
import { StudentRecentRequestsTable } from '@/components/student/StudentRecentRequestsTable'
import { DashboardErrorPanel } from '@/components/ui/DashboardErrorPanel'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthProvider'
import { useStudentDataContext } from '@/contexts/StudentDataContext'
import {
  computeSemesterStats,
  findCheckedOutPass,
} from '@/hooks/useStudentDashboardData'
import { isPassActive } from '@/lib/outpass'
import { canRequestExtension } from '@/lib/pass-filters'
import { isWithinSemester } from '@/lib/semester'
import type { OutpassRequest } from '@/lib/types'

export function StudentHomePage() {
  const { profile } = useAuth()
  const {
    passes,
    extensions,
    gateLogs,
    student,
    quotas,
    loading,
    error,
    refetch,
  } = useStudentDataContext()
  const [selectedPass, setSelectedPass] = useState<OutpassRequest | null>(null)
  const [detailInitialAction, setDetailInitialAction] = useState<'extension' | undefined>()
  const [retrying, setRetrying] = useState(false)

  const firstName = profile?.full_name?.split(/\s+/)[0] ?? 'Student'

  const approvedPasses = useMemo(
    () => passes.filter((pass) => pass.status === 'approved' || pass.status === 'extended'),
    [passes],
  )

  const semesterPasses = useMemo(
    () => passes.filter((p) => isWithinSemester(p.created_at)),
    [passes],
  )

  const recentPasses = useMemo(() => passes.slice(0, 5), [passes])
  const activePass = useMemo(() => passes.find(isPassActive) ?? null, [passes])
  const stats = useMemo(() => computeSemesterStats(semesterPasses), [semesterPasses])
  const activeCheckedOutPass = useMemo(
    () => findCheckedOutPass(passes, gateLogs),
    [passes, gateLogs],
  )

  const extensionEligiblePass = useMemo(() => {
    const active = activePass ?? activeCheckedOutPass
    if (!active || !canRequestExtension(active, gateLogs)) return null
    const hasPending = extensions.some(
      (e) => e.outpass_id === active.id && e.status === 'pending',
    )
    return hasPending ? null : active
  }, [activePass, activeCheckedOutPass, gateLogs, extensions])

  useEffect(() => {
    if (!selectedPass) return
    const updated =
      recentPasses.find((p) => p.id === selectedPass.id)
      ?? semesterPasses.find((p) => p.id === selectedPass.id)
      ?? passes.find((p) => p.id === selectedPass.id)
    if (updated) setSelectedPass(updated)
  }, [recentPasses, semesterPasses, passes, selectedPass])

  async function handleRetry() {
    setRetrying(true)
    try {
      await refetch()
    } finally {
      setRetrying(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading dashboard…" />
      </div>
    )
  }

  if (error && passes.length === 0) {
    return (
      <DashboardErrorPanel
        error={error}
        onRetry={handleRetry}
        retrying={retrying}
        title="Couldn’t load your dashboard"
      />
    )
  }

  const missingStudentRecord = !student

  return (
    <div className="space-y-6 sm:space-y-8">
      {error && passes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Connection issue — showing last loaded data.</span>
          <button
            type="button"
            onClick={handleRetry}
            className="font-semibold text-[#1A5CA0] hover:underline"
          >
            Refresh
          </button>
        </div>
      )}

      {missingStudentRecord && (
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFF8E1] px-4 py-3 text-sm text-[#92400E]">
          Your hostel student profile is not set up yet. You can still view passes, but contact the
          warden office to complete registration.
        </div>
      )}

      <StudentDashboardHero
        firstName={firstName}
        student={student}
        checkedOutPass={activeCheckedOutPass}
      />

      {activePass && (
        <ActivePassBanner
          pass={activePass}
          student={student}
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
        <StudentPassQuotaStats quotas={quotas} />
      </section>

      <section className="dashboard-section">
        <h2 className="dashboard-section-heading">
          <span className="dashboard-section-accent" aria-hidden />
          This semester
        </h2>
        <StudentDashboardStats
          total={stats.total}
          approved={stats.approved}
          pending={stats.pending}
          rejected={stats.rejected}
        />
      </section>

      <section className="dashboard-section">
        <StudentRecentRequestsTable
          passes={recentPasses}
          gateLogs={gateLogs}
          onSelectPass={setSelectedPass}
        />
      </section>

      <PassDetailSheet
        pass={selectedPass}
        student={student}
        extensions={extensions}
        gateLogs={gateLogs}
        quotas={quotas}
        approvedPasses={approvedPasses}
        initialAction={detailInitialAction}
        onClose={() => {
          setSelectedPass(null)
          setDetailInitialAction(undefined)
        }}
        onUpdated={() => {
          void refetch()
        }}
      />
    </div>
  )
}
