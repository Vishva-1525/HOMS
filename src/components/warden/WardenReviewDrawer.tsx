import { User } from 'lucide-react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { Button } from '@/components/ui/button'
import { PASS_TYPE_LABELS, formatReturnTime } from '@/lib/outpass'
import { getStudentName, getStudentReg, getStudentRoom } from '@/lib/warden'
import { formatRelativeTime } from '@/lib/relative-time'
import type { OutpassWithStudent } from '@/lib/types'
import { cn } from '@/lib/utils'

export type WardenReviewMode = 'approve' | 'reject'

interface WardenReviewDrawerProps {
  open: boolean
  mode: WardenReviewMode
  request: OutpassWithStudent | null
  remarks: string
  onRemarksChange: (value: string) => void
  onClose: () => void
  onPrimaryAction: () => void
  onSecondaryAction: () => void
  submitting?: boolean
  error?: string | null
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--svce-border-default)] py-2.5 text-sm last:border-0">
      <span className="text-[#4B5563]">{label}</span>
      <span className="text-right font-medium text-[#1A1A2E]">{value}</span>
    </div>
  )
}

export function WardenReviewDrawer({
  open,
  mode,
  request,
  remarks,
  onRemarksChange,
  onClose,
  onPrimaryAction,
  onSecondaryAction,
  submitting = false,
  error,
}: WardenReviewDrawerProps) {
  if (!open || !request) return null

  const student = request.students
  const isReject = mode === 'reject'

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close drawer"
        onClick={() => !submitting && onClose()}
      />
      <aside
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col border-l border-[var(--svce-border-default)] bg-white shadow-xl',
          'animate-[slideInRight_0.25s_ease-out]',
        )}
      >
        <div className="border-b border-[var(--svce-border-default)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1A1A2E]">
            {isReject ? 'Reject request' : 'Review request'}
          </h2>
          <p className="mt-0.5 text-sm text-[#4B5563]">
            {getStudentName(student)} · {getStudentReg(student)}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-4 rounded-xl border border-[var(--svce-border-default)] bg-[var(--svce-page-bg)] p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EBF3FF]">
              <User className="h-7 w-7 text-[#1A5CA0]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-[#1A1A2E]">{getStudentName(student)}</p>
              <p className="text-sm text-[#4B5563]">{getStudentReg(student)}</p>
              <p className="text-sm text-[#4B5563]">{getStudentRoom(student)}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <PassTypeBadge type={request.pass_type} />
          </div>

          <div className="mt-4">
            <DetailRow label="Destination" value={request.destination} />
            <DetailRow label="Reason" value={request.reason} />
            <DetailRow label="Pass type" value={PASS_TYPE_LABELS[request.pass_type]} />
            <DetailRow label="Departure" value={formatReturnTime(request.departure_at)} />
            <DetailRow label="Return by" value={formatReturnTime(request.return_by)} />
          </div>

          <div className="mt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#4B5563]">
              Timeline
            </p>
            <ol className="space-y-3 border-l-2 border-[#EBF3FF] pl-4">
              <li className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#1A5CA0]" />
                <p className="font-medium text-[#1A1A2E]">Submitted</p>
                <p className="text-xs text-[#4B5563]">
                  {formatReturnTime(request.created_at)} · {formatRelativeTime(request.created_at)}
                </p>
              </li>
              <li className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#D97706]" />
                <p className="font-medium text-[#1A1A2E]">Awaiting warden review</p>
                <p className="text-xs text-[#4B5563]">Pending your decision</p>
              </li>
            </ol>
          </div>

          <div className="mt-6 space-y-2">
            <label
              htmlFor="warden-remarks"
              className={cn(
                'text-sm font-medium',
                isReject ? 'text-[#DC2626]' : 'text-[#1A1A2E]',
              )}
            >
              Remarks {isReject ? '(required)' : '(optional)'}
            </label>
            <textarea
              id="warden-remarks"
              rows={3}
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              disabled={submitting}
              placeholder={isReject ? 'Reason for rejection…' : 'Optional notes for the student…'}
              className="w-full rounded-[var(--radius-md)] border border-[var(--svce-border-default)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--svce-primary-blue)] focus-visible:outline-offset-2 disabled:opacity-50"
            />
            {error && <p className="text-sm text-[#DC2626]">{error}</p>}
          </div>
        </div>

        <div className="space-y-2 border-t border-[var(--svce-border-default)] px-6 py-4">
          <Button
            type="button"
            className="w-full"
            variant={isReject ? 'danger' : 'primary'}
            loading={submitting}
            disabled={isReject && !remarks.trim()}
            onClick={onPrimaryAction}
          >
            {isReject ? 'Reject request' : 'Approve request'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn('w-full', !isReject && 'text-[#DC2626] hover:bg-[#FEF2F2]')}
            disabled={submitting}
            onClick={onSecondaryAction}
          >
            {isReject ? 'Cancel' : 'Reject instead'}
          </Button>
        </div>
      </aside>
    </div>
  )
}
