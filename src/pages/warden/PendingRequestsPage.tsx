import { useMemo, useState } from 'react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { BulkActionBar } from '@/components/shared/BulkActionBar'
import { PassLimitBadge } from '@/components/shared/PassLimitBadge'
import { PassListFilters, PENDING_PAGE_FILTER_DEFAULTS } from '@/components/shared/PassListFilters'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Label } from '@/components/ui/label'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { WardenReviewDrawer } from '@/components/warden/WardenReviewDrawer'
import { WardenPendingMobileCard } from '@/components/warden/WardenMobileCards'
import { useAuth } from '@/contexts/AuthProvider'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { usePassLimitViolations } from '@/hooks/usePassLimitViolations'
import { useWardenScope } from '@/hooks/warden/useWardenScope'
import { bulkApproveOutpassRequests, bulkRejectOutpassRequests } from '@/lib/bulk-approval'
import { classifyPass } from '@/lib/pass-classification'
import { formatPassDuration, formatRelativeTime } from '@/lib/relative-time'
import { approveOutpassRequest, rejectOutpassRequest } from '@/lib/warden-actions'
import { getStudentName, getStudentReg, getStudentRoom } from '@/lib/warden'
import type { OutpassWithStudent, PassType } from '@/lib/types'
import type { PassClassificationFilter } from '@/components/shared/PassListFilters'

export function PendingRequestsPage() {
  const { user } = useAuth()
  const { scope } = useWardenScope()
  const { passes, gateLogs, loading, error, scopeError, refetch } = useWardenDataContext()
  const { violationByStudentId } = usePassLimitViolations(scope)

  const [nameSearch, setNameSearch] = useState('')
  const [regSearch, setRegSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<PassType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<PassClassificationFilter>('pending')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [drawerMode, setDrawerMode] = useState<'approve' | 'reject' | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<OutpassWithStudent | null>(null)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null)
  const [bulkRemarks, setBulkRemarks] = useState('')
  const [bulkError, setBulkError] = useState<string | null>(null)

  const filteredPasses = useMemo(() => {
    const nameQ = nameSearch.trim().toLowerCase()
    const regQ = regSearch.trim().toLowerCase()

    return passes
      .filter((p) => typeFilter === 'all' || p.pass_type === typeFilter)
      .filter((p) => {
        const logs = gateLogs.filter((l) => l.outpass_id === p.id)
        const classification = classifyPass(p, logs)
        if (statusFilter === 'all') return true
        if (statusFilter === 'pending') return classification === 'pending'
        return classification === statusFilter
      })
      .filter((p) => {
        if (!nameQ) return true
        return getStudentName(p.students).toLowerCase().includes(nameQ)
      })
      .filter((p) => {
        if (!regQ) return true
        return getStudentReg(p.students).toLowerCase().includes(regQ)
      })
      .filter((p) => {
        if (!dateFrom && !dateTo) return true
        const created = new Date(p.created_at).getTime()
        if (dateFrom && created < new Date(dateFrom).getTime()) return false
        if (dateTo) {
          const end = new Date(dateTo)
          end.setHours(23, 59, 59, 999)
          if (created > end.getTime()) return false
        }
        return true
      })
  }, [passes, gateLogs, typeFilter, statusFilter, nameSearch, regSearch, dateFrom, dateTo])

  const pendingSelected = useMemo(
    () => filteredPasses.filter((p) => selectedIds.has(p.id) && p.status === 'pending'),
    [filteredPasses, selectedIds],
  )

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  async function executeBulkAction() {
    if (!user || !bulkAction || pendingSelected.length === 0) return

    if (bulkAction === 'reject' && !bulkRemarks.trim()) {
      setBulkError('Remarks are required when rejecting requests.')
      return
    }

    setSubmitting(true)
    setBulkError(null)

    const result =
      bulkAction === 'approve'
        ? await bulkApproveOutpassRequests(pendingSelected, user.id, bulkRemarks)
        : await bulkRejectOutpassRequests(pendingSelected, user.id, bulkRemarks)

    setSubmitting(false)

    if (result.failed > 0) {
      setBulkError(`${result.failed} request(s) failed.`)
      return
    }

    setBulkAction(null)
    setBulkRemarks('')
    setSelectedIds(new Set())
    await refetch()
  }

  function clearAllFilters() {
    setNameSearch(PENDING_PAGE_FILTER_DEFAULTS.nameSearch)
    setRegSearch(PENDING_PAGE_FILTER_DEFAULTS.regSearch)
    setTypeFilter(PENDING_PAGE_FILTER_DEFAULTS.typeFilter)
    setStatusFilter(PENDING_PAGE_FILTER_DEFAULTS.statusFilter)
    setDateFrom(PENDING_PAGE_FILTER_DEFAULTS.dateFrom)
    setDateTo(PENDING_PAGE_FILTER_DEFAULTS.dateTo)
  }

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading requests…" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Pending requests"
        subtitle={`${filteredPasses.length} matching your filters`}
      />

      {(error || scopeError) && (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {scopeError ?? error}
        </div>
      )}

      <PassListFilters
        nameSearch={nameSearch}
        regSearch={regSearch}
        onNameSearchChange={setNameSearch}
        onRegSearchChange={setRegSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClearAll={clearAllFilters}
      />

      <BulkActionBar
        selectedCount={pendingSelected.length}
        onApprove={() => setBulkAction('approve')}
        onReject={() => setBulkAction('reject')}
        onClear={() => setSelectedIds(new Set())}
        disabled={submitting}
      />

      <div className="dashboard-surface">
        <DataTable
          columns={[
            {
              header: 'Select',
              accessor: 'id',
              render: (row) =>
                row.status === 'pending' ? (
                  <input
                    type="checkbox"
                    aria-label={`Select ${getStudentName(row.students)}`}
                    checked={selectedIds.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                  />
                ) : null,
            },
            {
              header: 'Student',
              accessor: 'id',
              render: (row) => {
                const violation = violationByStudentId(row.student_id)
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{getStudentName(row.students)}</span>
                    <PassLimitBadge
                      weeklyExceeded={violation?.weekly_exceeded}
                      monthlyExceeded={violation?.monthly_exceeded}
                    />
                  </div>
                )
              },
            },
            { header: 'Reg No', accessor: 'id', render: (row) => getStudentReg(row.students) },
            { header: 'Room', accessor: 'id', render: (row) => getStudentRoom(row.students) },
            {
              header: 'Type',
              accessor: 'pass_type',
              render: (row) => <PassTypeBadge type={row.pass_type} />,
            },
            { header: 'Destination', accessor: 'destination' },
            { header: 'Reason', accessor: 'reason' },
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
              render: (row) =>
                row.status === 'pending' ? (
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
                ) : (
                  '—'
                ),
            },
          ]}
          data={filteredPasses}
          emptyMessage="No requests match your filters."
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

      <ConfirmModal
        open={bulkAction === 'approve'}
        title="Approve selected requests?"
        description={`Approve ${pendingSelected.length} pending request(s)?`}
        confirmLabel="Approve all"
        onConfirm={executeBulkAction}
        onCancel={() => setBulkAction(null)}
        loading={submitting}
      />

      <Modal
        open={bulkAction === 'reject'}
        title="Reject selected requests?"
        onClose={() => {
          setBulkAction(null)
          setBulkRemarks('')
          setBulkError(null)
        }}
        footer={
          <ModalFooter
            onCancel={() => {
              setBulkAction(null)
              setBulkRemarks('')
              setBulkError(null)
            }}
            onConfirm={executeBulkAction}
            confirmLabel="Reject all"
            loading={submitting}
          />
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Reject {pendingSelected.length} pending request(s). Remarks are required.
          </p>
          <div>
            <Label htmlFor="bulk-remarks">Remarks</Label>
            <textarea
              id="bulk-remarks"
              rows={3}
              value={bulkRemarks}
              onChange={(e) => setBulkRemarks(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
            />
          </div>
          {bulkError && <p className="text-sm text-[#DC2626]">{bulkError}</p>}
        </div>
      </Modal>
    </div>
  )
}
