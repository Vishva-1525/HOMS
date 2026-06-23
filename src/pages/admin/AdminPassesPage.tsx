import { useState } from 'react'
import { QrCode, Settings2 } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { useAdminPasses, type PassStatusFilter } from '@/hooks/admin/useAdminPasses'
import type { AdminPassRow } from '@/lib/admin-types'
import { formatReturnTime, formatTableDateTime } from '@/lib/outpass'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import { buildPassQrValue } from '@/lib/pass-qr'
import type { GateLog, OutpassStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

function gateLogsFromRow(row: AdminPassRow): GateLog[] {
  const logs: GateLog[] = []
  if (row.exit_at) {
    logs.push({
      id: `exit-${row.pass.id}`,
      outpass_id: row.pass.id,
      scanned_by: '',
      event_type: 'exit',
      scanned_at: row.exit_at,
    })
  }
  if (row.entry_at) {
    logs.push({
      id: `entry-${row.pass.id}`,
      outpass_id: row.pass.id,
      scanned_by: '',
      event_type: 'entry',
      scanned_at: row.entry_at,
    })
  }
  return logs
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
  const {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    setPage,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    overridePassStatus,
  } = useAdminPasses()

  const [overrideRow, setOverrideRow] = useState<AdminPassRow | null>(null)
  const [newStatus, setNewStatus] = useState<OutpassStatus>('approved')
  const [overrideNote, setOverrideNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [qrPass, setQrPass] = useState<AdminPassRow | null>(null)

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading passes…" />
      </div>
    )
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  return (
    <div className="space-y-6">
      <div className="dashboard-page-header">
        <h1 className="dashboard-heading text-xl md:text-2xl">All Passes</h1>
        <p className="dashboard-subheading mt-1.5 text-sm">View and manage all outpass requests</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search student or reg no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected', 'overdue', 'completed'] as PassStatusFilter[]).map(
          (status) => (
            <FilterChip
              key={status}
              active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </FilterChip>
          ),
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'outpass', 'staypass', 'night_pass'] as const).map((type) => (
          <FilterChip key={type} active={typeFilter === type} onClick={() => setTypeFilter(type)}>
            {type === 'all' ? 'All types' : type === 'night_pass' ? 'Night Pass' : type.charAt(0).toUpperCase() + type.slice(1)}
          </FilterChip>
        ))}
      </div>

      <div className="dashboard-surface overflow-hidden">
        <DataTable
          data={rows}
          getRowKey={(row) => row.pass.id}
          emptyMessage="No passes match your filters."
          columns={[
            { header: 'Student', accessor: 'student_name' },
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
                  status={getPassDisplayStatus(row.pass, gateLogsFromRow(row))}
                  label={getPassStatusLabel(row.pass.status, gateLogsFromRow(row), row.pass)}
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
    </div>
  )
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active ? 'bg-[#1A5CA0] text-white' : 'bg-white/60 text-slate-700 hover:bg-white/80',
      )}
    >
      {children}
    </button>
  )
}
