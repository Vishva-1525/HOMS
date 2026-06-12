import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { PassQrCode } from '@/components/student/PassQrCode'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PASS_TYPE_LABELS, formatReturnTime } from '@/lib/outpass'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import { canRequestExtension, isQrEligibleStatus } from '@/lib/pass-filters'
import { supabase } from '@/lib/supabase'
import type { ExtensionRequest, GateLog, OutpassRequest, Student } from '@/lib/types'
import { useAuth } from '@/contexts/AuthProvider'

interface PassDetailSheetProps {
  pass: OutpassRequest | null
  student: Student | null
  extensions: ExtensionRequest[]
  gateLogs?: GateLog[]
  onClose: () => void
  onUpdated: () => void
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--svce-border-default)] py-3 text-sm last:border-0">
      <span className="text-[#4B5563]">{label}</span>
      <span className="text-right font-medium text-[#1A1A2E]">{value}</span>
    </div>
  )
}

export function PassDetailSheet({
  pass,
  student,
  extensions,
  gateLogs = [],
  onClose,
  onUpdated,
}: PassDetailSheetProps) {
  const { profile } = useAuth()
  const [wardenName, setWardenName] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showExtensionForm, setShowExtensionForm] = useState(false)
  const [extensionTime, setExtensionTime] = useState('')
  const [extensionReason, setExtensionReason] = useState('')
  const [extensionError, setExtensionError] = useState<string | null>(null)
  const [submittingExtension, setSubmittingExtension] = useState(false)

  const pendingExtension = pass
    ? extensions.find((e) => e.outpass_id === pass.id && e.status === 'pending')
    : null

  useEffect(() => {
    if (!pass?.approved_by) {
      setWardenName(null)
      return
    }

    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', pass.approved_by)
      .maybeSingle()
      .then(({ data }) => setWardenName(data?.full_name ?? null))
  }, [pass?.approved_by])

  if (!pass) return null

  const showQr = isQrEligibleStatus(pass.status) && student
  const showExtensionButton =
    canRequestExtension(pass) && !pendingExtension && !showExtensionForm
  const showCancel = pass.status === 'pending'
  const displayStatus = getPassDisplayStatus(pass, gateLogs)
  const statusLabel = getPassStatusLabel(pass.status, gateLogs, pass)

  async function handleCancel() {
    setCancelling(true)
    const { error } = await supabase
      .from('outpass_requests')
      .update({ status: 'cancelled' })
      .eq('id', pass!.id)

    setCancelling(false)
    setShowCancelDialog(false)

    if (!error) {
      onUpdated()
      onClose()
    }
  }

  async function handleExtensionSubmit(event: FormEvent) {
    event.preventDefault()
    setExtensionError(null)

    if (!extensionTime) {
      setExtensionError('Please select a new return time.')
      return
    }

    if (!extensionReason.trim()) {
      setExtensionError('Please provide a reason for the extension.')
      return
    }

    const newReturn = new Date(extensionTime)
    const currentReturn = new Date(pass!.return_by)

    if (newReturn.getTime() <= currentReturn.getTime()) {
      setExtensionError('New return time must be after the current return time.')
      return
    }

    setSubmittingExtension(true)

    const { error } = await supabase.from('extension_requests').insert({
      outpass_id: pass!.id,
      new_return_time: newReturn.toISOString(),
      reason: extensionReason.trim(),
      status: 'pending',
    })

    setSubmittingExtension(false)

    if (error) {
      setExtensionError(error.message)
      return
    }

    setShowExtensionForm(false)
    setExtensionTime('')
    setExtensionReason('')
    onUpdated()
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end justify-center">
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          aria-label="Close"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 flex h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--svce-border-default)] bg-white"
        >
          <div className="flex items-center justify-between border-b border-[var(--svce-border-default)] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#1A1A2E]">Pass details</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-[#4B5563] hover:bg-[var(--svce-page-bg)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <PassTypeBadge type={pass.pass_type} />
              <StatusBadge status={displayStatus} label={statusLabel} />
            </div>

            <div className="rounded-xl border border-[var(--svce-border-default)] bg-[var(--svce-page-bg)] p-4">
              <p className="font-semibold text-[#1A1A2E]">{profile?.full_name ?? 'Student'}</p>
              <p className="mt-1 text-sm text-[#4B5563]">
                {student?.reg_number ?? '—'} · Room {student?.room_number ?? '—'}
              </p>
              {student?.department && (
                <p className="mt-0.5 text-sm text-[#4B5563]">{student.department}</p>
              )}
            </div>

            <div className="mt-4">
              <DetailRow label="Pass type" value={PASS_TYPE_LABELS[pass.pass_type]} />
              <DetailRow label="Destination" value={pass.destination} />
              <DetailRow label="Reason" value={pass.reason} />
              <DetailRow label="Departure" value={formatReturnTime(pass.departure_at)} />
              <DetailRow label="Return by" value={formatReturnTime(pass.return_by)} />
              {pass.approved_by && (
                <DetailRow label="Approved by" value={wardenName ?? 'Loading…'} />
              )}
            </div>

            {showQr && (
              <div className="mt-6">
                <p className="mb-3 text-center text-sm font-medium text-[#1A1A2E]">
                  Scan at gate
                </p>
                <PassQrCode pass={pass} regNumber={student.reg_number} />
              </div>
            )}

            {pendingExtension && (
              <div className="mt-4 rounded-lg bg-[#FFF8E1] px-3 py-2.5 text-sm text-[#92400E]">
                Extension requested — awaiting warden approval
              </div>
            )}

            {showExtensionForm && (
              <form
                onSubmit={handleExtensionSubmit}
                className="mt-4 space-y-3 rounded-xl border border-[var(--svce-border-default)] p-4"
              >
                <p className="text-sm font-medium text-[#1A1A2E]">Request extension</p>
                <div className="space-y-2">
                  <Label htmlFor="extension-time">New return time</Label>
                  <Input
                    id="extension-time"
                    type="datetime-local"
                    value={extensionTime}
                    onChange={(e) => setExtensionTime(e.target.value)}
                    disabled={submittingExtension}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extension-reason">Reason</Label>
                  <Input
                    id="extension-reason"
                    type="text"
                    placeholder="Why do you need more time?"
                    value={extensionReason}
                    onChange={(e) => setExtensionReason(e.target.value)}
                    disabled={submittingExtension}
                    required
                  />
                </div>
                {extensionError && (
                  <p className="text-sm text-[#DC2626]">{extensionError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowExtensionForm(false)}
                    disabled={submittingExtension}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" loading={submittingExtension}>
                    Submit
                  </Button>
                </div>
              </form>
            )}

            {showExtensionButton && (
              <Button
                type="button"
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => setShowExtensionForm(true)}
              >
                Request extension
              </Button>
            )}

            {showCancel && (
              <Button
                type="button"
                variant="ghost"
                className="mt-3 w-full text-[#DC2626] hover:bg-[#FEF2F2]"
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelling}
              >
                Cancel request
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showCancelDialog}
        title="Cancel this request?"
        description="This action cannot be undone. Your warden will no longer review this request."
        confirmLabel="Yes, cancel"
        cancelLabel="Keep request"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setShowCancelDialog(false)}
      />
    </>
  )
}
