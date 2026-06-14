import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react'
import { OverdueAlertBanner } from '@/components/warden/OverdueAlertBanner'
import { WardenReviewDrawer } from '@/components/warden/WardenReviewDrawer'
import { WardenPendingMobileCard } from '@/components/warden/WardenMobileCards'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { DataTable } from '@/components/ui/DataTable'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthProvider'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { getGreeting } from '@/lib/outpass'
import { formatPassDuration, formatRelativeTime, formatTodayDate } from '@/lib/relative-time'
import { approveOutpassRequest, rejectOutpassRequest } from '@/lib/warden-actions'
import { getStudentName, getStudentRoom } from '@/lib/warden'
import type { OutpassWithStudent } from '@/lib/types'

export function WardenHomePage() {
  const { profile, user } = useAuth()
  const { passes, stats, loading, error, refetch } = useWardenDataContext()
  const [drawerMode, setDrawerMode] = useState<'approve' | 'reject' | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<OutpassWithStudent | null>(null)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())

  const pendingPreview = useMemo(
    () => passes.filter((p) => p.status === 'pending').slice(0, 5),
    [passes],
  )

  function openDrawer(request: OutpassWithStudent, mode: 'approve' | 'reject') {
    setSelectedRequest(request)
    setDrawerMode(mode)
    setRemarks('')
    setActionError(null)
  }

  function closeDrawer() {
    if (submitting) return
    setDrawerMode(null)
    setSelectedRequest(null)
    setRemarks('')
    setActionError(null)
  }

  async function handleDecision(action: 'approve' | 'reject') {
    if (!selectedRequest || !user) return

    if (action === 'reject' && !remarks.trim()) {
      setActionError('Remarks are required when rejecting a request.')
      return
    }

    setSubmitting(true)
    setActionError(null)

    const result =
      action === 'approve'
        ? await approveOutpassRequest(selectedRequest, user.id, remarks)
        : await rejectOutpassRequest(selectedRequest, user.id, remarks)

    if (result.error) {
      setActionError(result.error)
      setSubmitting(false)
      return
    }

    setFadingIds((prev) => new Set(prev).add(selectedRequest.id))
    setSubmitting(false)
    closeDrawer()

    window.setTimeout(() => {
      setFadingIds((prev) => {
        const next = new Set(prev)
        next.delete(selectedRequest.id)
        return next
      })
      refetch()
    }, 300)
  }

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading dashboard…" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-page-header mb-0">
        <h1 className="dashboard-heading text-xl font-semibold sm:text-2xl">
          {getGreeting()}, {profile?.full_name?.split(/\s+/)[0] ?? 'Warden'}
        </h1>
        <p className="dashboard-subheading mt-1 text-sm">{formatTodayDate()}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending review"
          value={stats.pendingReview}
          icon={Clock}
          iconTone="amber"
        />
        <StatCard
          label="Currently out"
          value={stats.studentsOut}
          icon={Users}
          iconTone="blue"
        />
        <StatCard
          label="Approved today"
          value={stats.approvedToday}
          icon={CheckCircle}
          iconTone="green"
        />
        <StatCard
          label="Overdue"
          value={stats.overdueReturns}
          icon={AlertTriangle}
          iconTone="red"
          iconPulse={stats.overdueReturns > 0}
          valueClassName={stats.overdueReturns > 0 ? 'text-[#DC2626]' : undefined}
        />
      </div>

      <OverdueAlertBanner count={stats.overdueReturns} />

      <div>
        <div className="dashboard-section-bar">
          <h2 className="text-base font-semibold text-slate-900">Pending requests</h2>
          <Link to="/warden/pending" className="dashboard-link text-sm">
            View all
          </Link>
        </div>

        <div className="dashboard-surface">
          <DataTable
            columns={[
              {
                header: 'Student',
                accessor: 'id',
                render: (row) => getStudentName(row.students),
              },
              {
                header: 'Room',
                accessor: 'id',
                render: (row) => getStudentRoom(row.students),
              },
              {
                header: 'Type',
                accessor: 'pass_type',
                render: (row) => <PassTypeBadge type={row.pass_type} />,
              },
              { header: 'Destination', accessor: 'destination' },
              {
                header: 'Duration',
                accessor: 'departure_at',
                render: (row) => formatPassDuration(row.departure_at, row.return_by),
              },
              {
                header: 'Submitted',
                accessor: 'created_at',
                render: (row) => formatRelativeTime(row.created_at),
              },
              {
                header: 'Actions',
                accessor: 'id',
                render: (row) => (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => openDrawer(row, 'approve')}>
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-[#DC2626] hover:bg-[#FEF2F2]"
                      onClick={() => openDrawer(row, 'reject')}
                    >
                      Reject
                    </Button>
                  </div>
                ),
              },
            ]}
            data={pendingPreview}
            emptyMessage="No pending requests right now."
            getRowKey={(row) => row.id}
            getRowClassName={(row) => (fadingIds.has(row.id) ? 'opacity-0' : undefined)}
            mobileCardRender={(row) => (
              <WardenPendingMobileCard
                pass={row}
                onApprove={() => openDrawer(row, 'approve')}
                onReject={() => openDrawer(row, 'reject')}
              />
            )}
          />
        </div>
      </div>

      <WardenReviewDrawer
        open={drawerMode !== null}
        mode={drawerMode ?? 'approve'}
        request={selectedRequest}
        remarks={remarks}
        onRemarksChange={setRemarks}
        onClose={closeDrawer}
        onPrimaryAction={() => handleDecision(drawerMode ?? 'approve')}
        onSecondaryAction={() => {
          if (drawerMode === 'reject') closeDrawer()
          else setDrawerMode('reject')
        }}
        submitting={submitting}
        error={actionError}
      />
    </div>
  )
}
