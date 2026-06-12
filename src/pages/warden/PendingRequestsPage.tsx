import { useMemo, useState } from 'react'
import { PassRequestDetails } from '@/components/warden/PassRequestDetails'
import { PassTypeBadge } from '@/components/student/PassTypeBadge'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthProvider'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { PASS_TYPE_LABELS, formatReturnTime } from '@/lib/outpass'
import { getStudentName, getStudentReg, getStudentRoom } from '@/lib/warden'
import { supabase } from '@/lib/supabase'
import type { OutpassWithStudent, PassType } from '@/lib/types'
import { cn } from '@/lib/utils'

type PassTypeFilter = 'all' | PassType

export function PendingRequestsPage() {
  const { user } = useAuth()
  const { passes, loading, error, refetch } = useWardenDataContext()
  const [typeFilter, setTypeFilter] = useState<PassTypeFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [approveTarget, setApproveTarget] = useState<OutpassWithStudent | null>(null)
  const [rejectTarget, setRejectTarget] = useState<OutpassWithStudent | null>(null)
  const [remarks, setRemarks] = useState('')
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const pendingPasses = useMemo(() => {
    return passes
      .filter((p) => p.status === 'pending')
      .filter((p) => typeFilter === 'all' || p.pass_type === typeFilter)
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
  }, [passes, typeFilter, dateFrom, dateTo])

  async function handleApprove() {
    if (!approveTarget || !user) return
    setSubmitting(true)

    const { error: updateError } = await supabase
      .from('outpass_requests')
      .update({
        status: 'approved',
        approved_by: user.id,
        qr_code_data: crypto.randomUUID(),
        approved_at: new Date().toISOString(),
        warden_remark: remarks.trim() || null,
      })
      .eq('id', approveTarget.id)

    setSubmitting(false)

    if (!updateError) {
      setApproveTarget(null)
      setRemarks('')
      refetch()
    }
  }

  async function handleReject() {
    if (!rejectTarget || !user) return

    if (!rejectRemarks.trim()) {
      setRejectError('Remarks are required when rejecting a request.')
      return
    }

    setSubmitting(true)
    setRejectError(null)

    const { error: updateError } = await supabase
      .from('outpass_requests')
      .update({
        status: 'rejected',
        approved_by: user.id,
        warden_remark: rejectRemarks.trim(),
      })
      .eq('id', rejectTarget.id)

    setSubmitting(false)

    if (!updateError) {
      setRejectTarget(null)
      setRejectRemarks('')
      refetch()
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Spinner label="Loading requests..." />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Pending Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pendingPasses.length} request{pendingPasses.length !== 1 ? 's' : ''} awaiting review
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'outpass', 'staypass', 'night_pass'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                typeFilter === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {type === 'all' ? 'All' : PASS_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="date-from" className="text-xs">
              From
            </Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-36"
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
              className="h-9 w-36"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Reg No</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Pass type</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Departure</th>
                <th className="px-4 py-3">Return by</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingPasses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No pending requests match your filters.
                  </td>
                </tr>
              ) : (
                pendingPasses.map((request) => (
                  <tr key={request.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      {getStudentName(request.students)}
                    </td>
                    <td className="px-4 py-3">{getStudentReg(request.students)}</td>
                    <td className="px-4 py-3">{getStudentRoom(request.students)}</td>
                    <td className="px-4 py-3">
                      <PassTypeBadge type={request.pass_type} />
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3">{request.destination}</td>
                    <td className="max-w-[140px] truncate px-4 py-3">{request.reason}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatReturnTime(request.departure_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatReturnTime(request.return_by)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setRemarks('')
                            setApproveTarget(request)
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => {
                            setRejectRemarks('')
                            setRejectError(null)
                            setRejectTarget(request)
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!approveTarget}
        title="Approve request"
        onClose={() => !submitting && setApproveTarget(null)}
        footer={
          <ModalFooter
            onCancel={() => setApproveTarget(null)}
            onConfirm={handleApprove}
            confirmLabel="Confirm approval"
            loading={submitting}
          />
        }
      >
        {approveTarget && (
          <div className="space-y-4">
            <PassRequestDetails request={approveTarget} />
            <div className="space-y-2">
              <Label htmlFor="approve-remarks">Remarks (optional)</Label>
              <Input
                id="approve-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any notes for the student"
                disabled={submitting}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!rejectTarget}
        title="Reject request"
        onClose={() => !submitting && setRejectTarget(null)}
        footer={
          <ModalFooter
            onCancel={() => setRejectTarget(null)}
            onConfirm={handleReject}
            confirmLabel="Confirm rejection"
            confirmVariant="destructive"
            loading={submitting}
            confirmDisabled={!rejectRemarks.trim()}
          />
        }
      >
        {rejectTarget && (
          <div className="space-y-4">
            <PassRequestDetails request={rejectTarget} />
            <div className="space-y-2">
              <Label htmlFor="reject-remarks">Remarks *</Label>
              <Input
                id="reject-remarks"
                value={rejectRemarks}
                onChange={(e) => {
                  setRejectRemarks(e.target.value)
                  setRejectError(null)
                }}
                placeholder="Reason for rejection"
                disabled={submitting}
                required
              />
              <FieldError message={rejectError ?? undefined} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
