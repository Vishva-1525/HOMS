import { useEffect, useState } from 'react'
import { PassDetailSheet } from '@/components/student/PassDetailSheet'
import { StudentDashboardHeader } from '@/components/student/StudentDashboardHeader'
import { StudentDashboardStats } from '@/components/student/StudentDashboardStats'
import { StudentRecentRequestsTable } from '@/components/student/StudentRecentRequestsTable'
import { Spinner } from '@/components/ui/spinner'
import { useStudentDashboardData } from '@/hooks/useStudentDashboardData'
import { useStudentPasses } from '@/hooks/useStudentPasses'
import type { OutpassRequest } from '@/lib/types'

export function StudentHomePage() {
  const dashboard = useStudentDashboardData()
  const { extensions, gateLogs, refetch } = useStudentPasses()
  const [selectedPass, setSelectedPass] = useState<OutpassRequest | null>(null)

  useEffect(() => {
    if (!selectedPass) return
    const updated = dashboard.recentPasses.find((p) => p.id === selectedPass.id)
      ?? dashboard.semesterPasses.find((p) => p.id === selectedPass.id)
    if (updated) setSelectedPass(updated)
  }, [dashboard.recentPasses, dashboard.semesterPasses, selectedPass])

  if (dashboard.loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
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
    <div className="space-y-6">
      {missingStudentRecord && (
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFF8E1] px-4 py-3 text-sm text-[#92400E]">
          Your hostel student profile is not set up yet. You can still view passes, but contact the
          warden office to complete registration.
        </div>
      )}

      <StudentDashboardHeader />

      <StudentDashboardStats
        total={dashboard.stats.total}
        approved={dashboard.stats.approved}
        pending={dashboard.stats.pending}
        rejected={dashboard.stats.rejected}
      />

      <StudentRecentRequestsTable
        passes={dashboard.recentPasses}
        gateLogs={gateLogs}
        onSelectPass={setSelectedPass}
      />

      <PassDetailSheet
        pass={selectedPass}
        student={dashboard.student}
        extensions={extensions}
        gateLogs={gateLogs}
        onClose={() => setSelectedPass(null)}
        onUpdated={refetch}
      />
    </div>
  )
}
