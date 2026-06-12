import { useMemo, useState } from 'react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { WardenReviewDrawer } from '@/components/warden/WardenReviewDrawer'
import { useAuth } from '@/contexts/AuthProvider'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { PASS_TYPE_LABELS } from '@/lib/outpass'
import { formatPassDuration, formatRelativeTime } from '@/lib/relative-time'
import { approveOutpassRequest, rejectOutpassRequest } from '@/lib/warden-actions'
import { getStudentName, getStudentReg, getStudentRoom } from '@/lib/warden'
import type { OutpassWithStudent, PassType } from '@/lib/types'
import { cn } from '@/lib/utils'

type PassTypeFilter = 'all' | PassType

export function PendingRequestsPage() {
  const { user } = useAuth()
  const { passes, loading, error, refetch } = useWardenDataContext()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<PassTypeFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [drawerMode, setDrawerMode] = useState<'approve' | 'reject' | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<OutpassWithStudent | null>(null)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())

  const pendingPasses = useMemo(() => {
    return passes
      .filter((p) => p.status === 'pending')
      .filter((p) => typeFilter === 'all' || p.pass_type === typeFilter)
      .filter((p) => {
        if (!search.trim()) return true
        const q = search.trim().toLowerCase()
        const name = getStudentName(p.students).toLowerCase()
        const reg = getStudentReg(p.students).toLowerCase()
        return name.includes(q) || reg.includes(q)
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
  }, [passes, typeFilter, search, dateFrom, dateTo])

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading requests…" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending requests"
        subtitle={`${pendingPasses.length} awaiting review`}
      />

      {error && (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-[var(--svce-border-default)] bg-white p-4">
        <Input
          placeholder="Search by name or register number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />

        <div className="flex flex-wrap gap-2">
          {(['all', 'outpass', 'staypass', 'night_pass'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={cn(
                'rounded-[var(--radius-full)] px-3.5 py-1.5 text-xs font-medium transition-colors',
                typeFilter === type
                  ? 'bg-[#1A5CA0] text-white'
                  : 'border border-[var(--svce-border-default)] bg-white text-[#4B5563]',
              )}
            >
              {type === 'all' ? 'All' : PASS_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="date-from" className="text-xs">
              From
            </Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 h-9 w-40"
            />
          </div>
          <div>
            <Label htmlFor="date-to" className="text-xs">
              To
            </Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 h-9 w-40"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--svce-border-default)] bg-white">
        <DataTable
          columns={[
            { header: 'Student', accessor: 'id', render: (row) => getStudentName(row.students) },
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
          data={pendingPasses}
          emptyMessage="No pending requests match your filters."
          getRowKey={(row) => row.id}
          getRowClassName={(row) => (fadingIds.has(row.id) ? 'opacity-0' : undefined)}
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
    </div>
  )
}
