import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { formatReturnTime } from '@/lib/outpass'
import { getStudentName, getStudentReg, getStudentRoom } from '@/lib/warden'
import { supabase } from '@/lib/supabase'
import type { ExtensionWithOutpass } from '@/lib/types'

export function ExtensionRequestsPage() {
  const { refetch } = useWardenDataContext()
  const [extensions, setExtensions] = useState<ExtensionWithOutpass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approveTarget, setApproveTarget] = useState<ExtensionWithOutpass | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ExtensionWithOutpass | null>(null)
  const [remarks, setRemarks] = useState('')
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function fetchExtensions() {
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('extension_requests')
      .select(`
        *,
        outpass_requests (
          *,
          students (
            reg_number,
            room_number,
            hostel_block,
            profiles ( full_name )
          )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setExtensions((data ?? []) as ExtensionWithOutpass[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchExtensions()

    const channel = supabase
      .channel('warden-extensions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'extension_requests' },
        () => fetchExtensions(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleApprove() {
    if (!approveTarget) return
    setSubmitting(true)

    const { error: extError } = await supabase
      .from('extension_requests')
      .update({ status: 'approved' })
      .eq('id', approveTarget.id)

    if (!extError && approveTarget.outpass_requests) {
      await supabase
        .from('outpass_requests')
        .update({
          return_by: approveTarget.new_return_time,
          status: 'extended',
        })
        .eq('id', approveTarget.outpass_id)
    }

    setSubmitting(false)

    if (!extError) {
      setApproveTarget(null)
      setRemarks('')
      fetchExtensions()
      refetch()
    }
  }

  async function handleReject() {
    if (!rejectTarget) return

    if (!rejectRemarks.trim()) {
      setRejectError('Remarks are required when rejecting an extension.')
      return
    }

    setSubmitting(true)
    setRejectError(null)

    const { error: extError } = await supabase
      .from('extension_requests')
      .update({ status: 'rejected' })
      .eq('id', rejectTarget.id)

    setSubmitting(false)

    if (!extError) {
      setRejectTarget(null)
      setRejectRemarks('')
      fetchExtensions()
      refetch()
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Spinner label="Loading extensions..." />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Extension Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {extensions.length} pending extension{extensions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Reg No</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Current return</th>
                <th className="px-4 py-3">Requested return</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {extensions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No pending extension requests.
                  </td>
                </tr>
              ) : (
                extensions.map((ext) => {
                  const outpass = ext.outpass_requests
                  const student = outpass?.students

                  return (
                    <tr key={ext.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{getStudentName(student)}</td>
                      <td className="px-4 py-3">{getStudentReg(student)}</td>
                      <td className="px-4 py-3">{getStudentRoom(student)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {outpass ? formatReturnTime(outpass.return_by) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-primary">
                        {formatReturnTime(ext.new_return_time)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3">{ext.reason}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setRemarks('')
                              setApproveTarget(ext)
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
                              setRejectTarget(ext)
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!approveTarget}
        title="Approve extension"
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
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Student: </span>
              <span className="font-medium">
                {getStudentName(approveTarget.outpass_requests?.students)}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Current return: </span>
              {approveTarget.outpass_requests
                ? formatReturnTime(approveTarget.outpass_requests.return_by)
                : '—'}
            </p>
            <p>
              <span className="text-muted-foreground">New return: </span>
              <span className="font-medium text-primary">
                {formatReturnTime(approveTarget.new_return_time)}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Reason: </span>
              {approveTarget.reason}
            </p>
            <div className="space-y-2 pt-2">
              <Label htmlFor="ext-approve-remarks">Remarks (optional)</Label>
              <Input
                id="ext-approve-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!rejectTarget}
        title="Reject extension"
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
          <div className="space-y-4 text-sm">
            <p>
              <span className="text-muted-foreground">Requested return: </span>
              {formatReturnTime(rejectTarget.new_return_time)}
            </p>
            <p>
              <span className="text-muted-foreground">Reason: </span>
              {rejectTarget.reason}
            </p>
            <div className="space-y-2">
              <Label htmlFor="ext-reject-remarks">Remarks *</Label>
              <Input
                id="ext-reject-remarks"
                value={rejectRemarks}
                onChange={(e) => {
                  setRejectRemarks(e.target.value)
                  setRejectError(null)
                }}
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
