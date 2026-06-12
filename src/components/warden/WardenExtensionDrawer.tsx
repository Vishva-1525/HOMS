import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatReturnTime } from '@/lib/outpass'
import { getStudentName, getStudentReg, getStudentRoom } from '@/lib/warden'
import { formatRelativeTime } from '@/lib/relative-time'
import type { ExtensionWithOutpass } from '@/lib/types'
import { cn } from '@/lib/utils'

export type ExtensionReviewMode = 'approve' | 'reject'

interface WardenExtensionDrawerProps {
  open: boolean
  mode: ExtensionReviewMode
  extension: ExtensionWithOutpass | null
  remarks: string
  onRemarksChange: (value: string) => void
  onClose: () => void
  onPrimaryAction: () => void
  onSecondaryAction: () => void
  submitting?: boolean
  error?: string | null
}

export function WardenExtensionDrawer({
  open,
  mode,
  extension,
  remarks,
  onRemarksChange,
  onClose,
  onPrimaryAction,
  onSecondaryAction,
  submitting = false,
  error,
}: WardenExtensionDrawerProps) {
  if (!open || !extension) return null

  const outpass = extension.outpass_requests
  const student = outpass?.students
  const isReject = mode === 'reject'

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close drawer"
        onClick={() => !submitting && onClose()}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col border-l border-[var(--svce-border-default)] bg-white shadow-xl animate-[slideInRight_0.25s_ease-out]">
        <div className="border-b border-[var(--svce-border-default)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1A1A2E]">
            {isReject ? 'Reject extension' : 'Review extension'}
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
              <p className="text-sm text-[#4B5563]">{getStudentRoom(student)}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[#4B5563]">Current return</span>
              <span className="font-medium">
                {outpass ? formatReturnTime(outpass.return_by) : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#4B5563]">Requested return</span>
              <span className="font-medium text-[#1A5CA0]">
                {formatReturnTime(extension.new_return_time)}
              </span>
            </div>
            <div>
              <p className="text-[#4B5563]">Reason</p>
              <p className="mt-1 font-medium text-[#1A1A2E]">{extension.reason}</p>
            </div>
            <p className="text-xs text-[#4B5563]">
              Submitted {formatRelativeTime(extension.created_at)}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <label
              htmlFor="ext-remarks"
              className={cn('text-sm font-medium', isReject ? 'text-[#DC2626]' : 'text-[#1A1A2E]')}
            >
              Remarks {isReject ? '(required)' : '(optional)'}
            </label>
            <textarea
              id="ext-remarks"
              rows={3}
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              disabled={submitting}
              className="w-full rounded-[var(--radius-md)] border border-[var(--svce-border-default)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--svce-primary-blue)] focus-visible:outline-offset-2"
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
            {isReject ? 'Reject extension' : 'Approve extension'}
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
