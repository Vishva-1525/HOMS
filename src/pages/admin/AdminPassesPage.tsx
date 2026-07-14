import { useMemo, useState } from 'react'
import { QrCode, Settings2 } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { BulkActionBar } from '@/components/shared/BulkActionBar'
import { PassLimitBadge } from '@/components/shared/PassLimitBadge'
import { PassListFilters, ALL_PASS_FILTER_DEFAULTS } from '@/components/shared/PassListFilters'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthProvider'
import { useAdminPasses } from '@/hooks/admin/useAdminPasses'
import { usePassLimitViolations } from '@/hooks/usePassLimitViolations'
import type { AdminPassRow } from '@/lib/admin-types'
import { bulkApproveOutpassRequests, bulkRejectOutpassRequests } from '@/lib/bulk-approval'
import { formatReturnTime, formatTableDateTime } from '@/lib/outpass'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import { buildPassQrValue } from '@/lib/pass-qr'
import type { OutpassStatus, OutpassWithStudent } from '@/lib/types'

function toOutpassWithStudent(row: AdminPassRow): OutpassWithStudent {
  return {
    ...row.pass,
    students: {
      reg_number: row.reg_number,
      room_number: row.room_number,
      hostel_block: row.hostel_block,
      profiles: { full_name: row.student_name },
    },
  }
}

function formatDurationOutside(exitAt: string | null, entryAt: string | null): string {
  if (!exitAt || !entryAt) return '—'
  const ms = new Date(entryAt).getTime() - new Date(exitAt).getTime()
  if (ms <= 0) return '—'
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  return `${hours}h ${minutes}m`
}

export function AdminPassesPage() {
  const { user } = useAuth()
  const {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    setPage,
    loading,
    error,
    nameSearch,
    setNameSearch,
    regSearch,
    setRegSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    overridePassStatus,
    refetch,
  } = useAdminPasses()
  const { violationByStudentId } = usePassLimitViolations()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [overrideRow, setOverrideRow] = useState<AdminPassRow | null>(null)
  const [newStatus, setNewStatus] = useState<OutpassStatus>('approved')
  const [overrideNote, setOverrideNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [qrPass, setQrPass] = useState<AdminPassRow | null>(null)
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null)
  const [bulkRemarks, setBulkRemarks] = useState('')
  const [bulkError, setBulkError] = useState<string | null>(null)

  const pendingSelectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.pass.id) && r.pass.status === 'pending'),
    [rows, selectedIds],
  )

  const allPendingOnPageSelected = useMemo(
    () =>
      rows.filter((r) => r.pass.status === 'pending').length > 0
      && rows.filter((r) => r.pass.status === 'pending').every((r) => selectedIds.has(r.pass.id)),
    [rows, selectedIds],
  )

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllPendingOnPage() {
    const pendingIds = rows.filter((r) => r.pass.status === 'pending').map((r) => r.pass.id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPendingOnPageSelected) pendingIds.forEach((id) => next.delete(id))
      else pendingIds.forEach((id) => next.add(id))
      return next
    })
  }

  const showSelectAll = rows.some((r) => r.pass.status === 'pending')

  async function executeBulkAction() {
    if (!user || !bulkAction || pendingSelectedRows.length === 0) return

    if (bulkAction === 'reject' && !bulkRemarks.trim()) {
      setBulkError('Remarks are required when rejecting requests.')
      return
    }

    setSubmitting(true)
    setBulkError(null)

    const requests = pendingSelectedRows.map(toOutpassWithStudent)
    const result =
      bulkAction === 'approve'
        ? await bulkApproveOutpassRequests(requests, user.id, bulkRemarks)
        : await bulkRejectOutpassRequests(requests, user.id, bulkRemarks)

    setSubmitting(false)

    if (result.failed > 0) {
      setBulkError(`${result.failed} request(s) failed. ${result.errors[0] ?? ''}`)
      return
    }

    setBulkAction(null)
    setBulkRemarks('')
    setSelectedIds(new Set())
    await refetch()
  }

  if (loading && rows.length === 0) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading passes…" />
      </div>
    )
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  function clearAllFilters() {
    setNameSearch(ALL_PASS_FILTER_DEFAULTS.nameSearch)
    setRegSearch(ALL_PASS_FILTER_DEFAULTS.regSearch)
    setStatusFilter(ALL_PASS_FILTER_DEFAULTS.statusFilter)
    setTypeFilter(ALL_PASS_FILTER_DEFAULTS.typeFilter)
    setDateFrom(ALL_PASS_FILTER_DEFAULTS.dateFrom)
    setDateTo(ALL_PASS_FILTER_DEFAULTS.dateTo)
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-page-header">
        <h1 className="dashboard-heading text-2xl md:text-3xl">All Passes</h1>
        <p className="dashboard-subheading mt-1.5 text-sm sm:text-[15px]">
          View and manage all outpass requests
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
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
        filterDefaults={ALL_PASS_FILTER_DEFAULTS}
      />

      <BulkActionBar
        selectedCount={pendingSelectedRows.length}
        onApprove={() => setBulkAction('approve')}
        onReject={() => setBulkAction('reject')}
        onClear={() => setSelectedIds(new Set())}
        disabled={submitting}
      />

      {showSelectAll && (
        <button
          type="button"
          onClick={toggleAllPendingOnPage}
          className="text-xs font-medium text-[#1A5CA0] hover:underline"
        >
          {allPendingOnPageSelected ? 'Deselect all on page' : 'Select all pending on page'}
        </button>
      )}

      <div className="dashboard-surface overflow-hidden">
        <DataTable
          data={rows}
          getRowKey={(row) => row.pass.id}
          emptyMessage="No passes match your filters."
          columns={[
            {
              header: 'Select',
              accessor: 'pass',
              render: (row) =>
                row.pass.status === 'pending' ? (
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.student_name}`}
                    checked={selectedIds.has(row.pass.id)}
                    onChange={() => toggleRow(row.pass.id)}
                  />
                ) : null,
            },
            {
              header: 'Student',
              accessor: 'student_name',
              render: (row) => {
                const violation = violationByStudentId(row.student_id)
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{row.student_name}</span>
                    <PassLimitBadge
                      weeklyExceeded={violation?.weekly_exceeded}
                      monthlyExceeded={violation?.monthly_exceeded}
                    />
                  </div>
                )
              },
            },
            { header: 'Reg No', accessor: 'reg_number' },
            {
              header: 'Room',
              accessor: 'room_number',
              render: (row) => `${row.room_number} · ${row.hostel_block}`,
            },
            {
              header: 'Pass type',
              accessor: 'pass',
              render: (row) => <PassTypeBadge type={row.pass.pass_type} />,
            },
            { header: 'Destination', accessor: 'pass', render: (row) => row.pass.destination },
            {
              header: 'Departure',
              accessor: 'pass',
              render: (row) => formatTableDateTime(row.pass.departure_at),
            },
            {
              header: 'Return by',
              accessor: 'pass',
              render: (row) => formatReturnTime(row.pass.return_by),
            },
            {
              header: 'Status',
              accessor: 'pass',
              render: (row) => (
                <StatusBadge
                  status={getPassDisplayStatus(row.pass, row.gate_logs)}
                  label={getPassStatusLabel(row.pass.status, row.gate_logs, row.pass)}
                />
              ),
            },
            {
              header: 'Warden remark',
              accessor: 'pass',
              render: (row) => row.pass.warden_remark ?? '—',
            },
            {
              header: 'Exit',
              accessor: 'exit_at',
              render: (row) => (row.exit_at ? formatReturnTime(row.exit_at) : '—'),
            },
            {
              header: 'Entry',
              accessor: 'entry_at',
              render: (row) => (row.entry_at ? formatReturnTime(row.entry_at) : '—'),
            },
            {
              header: 'Duration outside',
              accessor: 'exit_at',
              render: (row) => formatDurationOutside(row.exit_at, row.entry_at),
            },
            {
              header: 'Actions',
              accessor: 'pass',
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                    aria-label="Override status"
                    onClick={() => {
                      setOverrideRow(row)
                      setNewStatus(row.pass.status)
                      setOverrideNote(row.pass.admin_override_note ?? '')
                    }}
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                  {(row.pass.status === 'approved' || row.pass.status === 'extended') && (
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-[#1A5CA0] hover:bg-blue-50"
                      aria-label="View QR"
                      onClick={() => setQrPass(row)}
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className="flex items-center justify-between gap-4 text-sm text-slate-700">
        <p>
          Showing {rangeStart}–{rangeEnd} of {total}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={Boolean(overrideRow)}
        title="Override pass status"
        onClose={() => setOverrideRow(null)}
        footer={
          <ModalFooter
            onCancel={() => setOverrideRow(null)}
            onConfirm={async () => {
              if (!overrideRow) return
              setSubmitting(true)
              try {
                await overridePassStatus(overrideRow.pass.id, newStatus, overrideNote)
                setOverrideRow(null)
              } finally {
                setSubmitting(false)
              }
            }}
            confirmLabel="Save override"
            loading={submitting}
          />
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="override-status">New status</Label>
            <select
              id="override-status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OutpassStatus)}
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
            >
              {(['pending', 'approved', 'rejected', 'extended', 'cancelled'] as OutpassStatus[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <Label htmlFor="override-note">Reason / note</Label>
            <Input
              id="override-note"
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              placeholder="Admin override reason"
            />
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(qrPass)} title="Pass QR code" onClose={() => setQrPass(null)}>
        {qrPass && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-slate-600">
              {qrPass.student_name} · {qrPass.reg_number}
            </p>
            <div className="rounded-xl border bg-white p-4">
              <QRCodeCanvas value={buildPassQrValue(qrPass.pass)} size={180} level="H" />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={bulkAction === 'approve'}
        title="Approve selected requests?"
        description={`You are about to approve ${pendingSelectedRows.length} pending request(s).`}
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
            You are about to reject {pendingSelectedRows.length} pending request(s). Remarks are
            required.
          </p>
          <div>
            <Label htmlFor="bulk-remarks">Remarks</Label>
            <textarea
              id="bulk-remarks"
              rows={3}
              value={bulkRemarks}
              onChange={(e) => setBulkRemarks(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
              placeholder="Reason for rejection"
            />
          </div>
          {bulkError && <p className="text-sm text-[#DC2626]">{bulkError}</p>}
        </div>
      </Modal>
    </div>
  )
}
