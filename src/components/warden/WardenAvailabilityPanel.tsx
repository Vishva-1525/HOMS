import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { WardenScope } from '@/lib/warden-scope'
import { cn } from '@/lib/utils'

interface WardenAvailabilityPanelProps {
  scope: WardenScope
  onSetAvailability: (
    isAvailable: boolean,
    reason?: string,
  ) => Promise<{ error: string | null }>
}

export function WardenAvailabilityPanel({
  scope,
  onSetAvailability,
}: WardenAvailabilityPanelProps) {
  const [showReasonForm, setShowReasonForm] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (scope.tier === 'superior') {
    return (
      <div className="dashboard-surface px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1A5CA0]" aria-hidden />
          <p className="text-sm font-medium text-[var(--glass-fg)]">Coverage mode</p>
        </div>
        <p className="mt-1.5 pl-3.5 text-xs leading-relaxed text-[var(--glass-fg-muted)]">
          You receive escalated requests for {scope.gender} hostel blocks when an RT is on leave.
          {scope.escalatedBlocks.length === 0
            ? ' No blocks are escalated right now.'
            : ` Active: ${scope.escalatedBlocks.join(', ')}.`}
        </p>
      </div>
    )
  }

  async function confirmLeave() {
    if (!reason.trim()) {
      setError('Please enter a brief reason for leave.')
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await onSetAvailability(false, reason.trim())
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setShowReasonForm(false)
    setReason('')
  }

  async function resumeDuty() {
    setSubmitting(true)
    setError(null)
    const result = await onSetAvailability(true)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  const onDuty = scope.isAvailable

  return (
    <div className="dashboard-surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                onDuty ? 'bg-emerald-500' : 'bg-amber-500',
              )}
              aria-hidden
            />
            <p className="text-sm font-medium text-[var(--glass-fg)]">
              {onDuty ? 'On duty' : 'On leave'}
            </p>
          </div>
          <p className="mt-1 pl-3.5 text-xs leading-relaxed text-[var(--glass-fg-muted)]">
            {onDuty
              ? 'New requests for your block are assigned to you. Set leave when unavailable.'
              : `Superior wardens are covering your block${
                  scope.unavailableReason ? ` · ${scope.unavailableReason}` : ''
                }`}
          </p>
        </div>

        {onDuty ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setShowReasonForm((v) => !v)
              setError(null)
            }}
            className="shrink-0 rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium text-[var(--glass-fg)] transition-colors hover:bg-[var(--glass-bg-muted)] disabled:opacity-50"
          >
            {showReasonForm ? 'Cancel' : 'Set on leave'}
          </button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            loading={submitting}
            onClick={() => void resumeDuty()}
            className="shrink-0"
          >
            Resume duty
          </Button>
        )}
      </div>

      {showReasonForm && onDuty && (
        <div className="space-y-3 border-t border-[var(--glass-border)] bg-[var(--glass-bg-muted)] px-4 py-3.5 sm:px-5">
          <div className="space-y-1.5">
            <Label htmlFor="away-reason" className="text-xs text-[var(--glass-fg-muted)]">
              Reason for leave
            </Label>
            <textarea
              id="away-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. On leave until Monday, medical, conference…"
              className="flex w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--glass-fg)] placeholder:text-[var(--glass-fg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={submitting} onClick={() => void confirmLeave()}>
              Confirm leave
            </Button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setShowReasonForm(false)
                setReason('')
                setError(null)
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--glass-fg-muted)] hover:text-[var(--glass-fg)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="border-t border-[var(--glass-border)] px-4 py-2.5 text-xs text-[#DC2626] sm:px-5">
          {error}
        </p>
      )}
    </div>
  )
}
