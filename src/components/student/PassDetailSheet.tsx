import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { ApprovalTimeline } from '@/components/student/ApprovalTimeline'
import { PassQrCode } from '@/components/student/PassQrCode'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  EXTENSION_DURATION_OPTIONS,
  computeExtendedReturnTime,
  formatExtensionDuration,
} from '@/lib/extension'
import { PASS_TYPE_LABELS, formatReturnTime } from '@/lib/outpass'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import { canRequestExtension } from '@/lib/pass-filters'
import { SPECIAL_PASS_PURPOSE_LABELS } from '@/lib/special-pass'
import { supabase } from '@/lib/supabase'
import type { ExtensionRequest, ExtensionStatus, GateLog, OutpassRequest, Student, StudentPassQuotas } from '@/lib/types'
import { useAuth } from '@/contexts/AuthProvider'
import { cn } from '@/lib/utils'

interface PassDetailSheetProps {
  pass: OutpassRequest | null
  student: Student | null
  extensions: ExtensionRequest[]
  gateLogs?: GateLog[]
  quotas?: StudentPassQuotas
  approvedPasses?: OutpassRequest[]
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

const EXTENSION_STATUS_STYLES: Record<ExtensionStatus, string> = {
  pending: 'bg-[#FFF8E1] text-[#92400E] border-[#FDE68A]',
  approved: 'bg-[#EBF7EE] text-[#166534] border-[#BBF7D0]',
  rejected: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]',
}

const EXTENSION_STATUS_LABELS: Record<ExtensionStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export function PassDetailSheet({
  pass,
  student,
  extensions,
  gateLogs = [],
  quotas,
  approvedPasses,
  onClose,
  onUpdated,
}: PassDetailSheetProps) {
  const { profile } = useAuth()
  const [wardenName, setWardenName] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showExtensionForm, setShowExtensionForm] = useState(false)
  const [extensionDurationHours, setExtensionDurationHours] = useState('2')
  const [extensionReason, setExtensionReason] = useState('')
  const [extensionError, setExtensionError] = useState<string | null>(null)
  const [submittingExtension, setSubmittingExtension] = useState(false)

  const passExtensions = pass
    ? extensions
        .filter((e) => e.outpass_id === pass.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : []

  const pendingExtension = passExtensions.find((e) => e.status === 'pending')

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

  const showExtensionButton =
    canRequestExtension(pass, gateLogs) && !pendingExtension && !showExtensionForm
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

    const additionalHours = Number(extensionDurationHours)
    if (!additionalHours || additionalHours < 1) {
      setExtensionError('Please select additional duration.')
      return
    }

    if (!extensionReason.trim()) {
      setExtensionError('Please provide a reason for the extension.')
      return
    }

    const newReturn = computeExtendedReturnTime(pass!.return_by, additionalHours)

    setSubmittingExtension(true)

    const { error } = await supabase.from('extension_requests').insert({
      outpass_id: pass!.id,
      new_return_time: newReturn.toISOString(),
      reason: extensionReason.trim(),
      additional_duration_hours: additionalHours,
      status: 'pending',
    })

    setSubmittingExtension(false)

    if (error) {
      setExtensionError(error.message)
      return
    }

    setShowExtensionForm(false)
    setExtensionDurationHours('2')
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
              {pass.special_purpose && (
                <DetailRow
                  label="Purpose"
                  value={SPECIAL_PASS_PURPOSE_LABELS[pass.special_purpose]}
                />
              )}
              {pass.special_remarks && (
                <DetailRow label="Remarks" value={pass.special_remarks} />
              )}
              <DetailRow label="Departure" value={formatReturnTime(pass.departure_at)} />
              <DetailRow label="Return by" value={formatReturnTime(pass.return_by)} />
              {pass.approved_by && (
                <DetailRow label="Approved by" value={wardenName ?? 'Loading…'} />
              )}
            </div>

            <ApprovalTimeline pass={pass} gateLogs={gateLogs} />

            {student && (pass.status === 'approved' || pass.status === 'extended') ? (
              <div className="mt-6">
                <p className="mb-3 text-center text-sm font-medium text-[#1A1A2E]">
                  Scan at gate
                </p>
                <PassQrCode pass={pass} quotas={quotas} approvedPasses={approvedPasses} />
              </div>
            ) : null}

            {passExtensions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-[#1A1A2E]">Extension requests</p>
                {passExtensions.map((extension) => (
                  <div
                    key={extension.id}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-sm',
                      EXTENSION_STATUS_STYLES[extension.status],
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {EXTENSION_STATUS_LABELS[extension.status]}
                      </span>
                      {extension.additional_duration_hours ? (
                        <span className="text-xs">
                          +{formatExtensionDuration(extension.additional_duration_hours)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs opacity-90">{extension.reason}</p>
                    <p className="mt-1 text-xs opacity-80">
                      New return: {formatReturnTime(extension.new_return_time)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {showExtensionForm && (
              <form
                onSubmit={handleExtensionSubmit}
                className="mt-4 space-y-3 rounded-xl border border-[var(--svce-border-default)] p-4"
              >
                <p className="text-sm font-medium text-[#1A1A2E]">Request extension</p>
                <div className="space-y-2">
                  <Label htmlFor="extension-duration">Additional duration</Label>
                  <select
                    id="extension-duration"
                    value={extensionDurationHours}
                    onChange={(e) => setExtensionDurationHours(e.target.value)}
                    disabled={submittingExtension}
                    className="flex h-10 w-full rounded-xl border border-white/55 bg-white/50 px-3 text-sm text-slate-900 shadow-sm"
                  >
                    {EXTENSION_DURATION_OPTIONS.map((option) => (
                      <option key={option.hours} value={String(option.hours)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
