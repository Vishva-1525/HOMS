import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
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
      <div className="glass-panel border-[#BFDBFE] bg-[#EBF3FF]/80 px-4 py-3 text-sm text-[#0D3F72]">
        <p className="font-semibold">Warden coverage</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-700">
          You receive escalated requests for all {scope.gender} hostel blocks while their RT is Away.
          {scope.escalatedBlocks.length === 0
            ? ' No blocks are escalated right now.'
            : ` Active escalations: ${scope.escalatedBlocks.join(', ')}.`}
        </p>
      </div>
    )
  }

  async function goAway() {
    if (!reason.trim()) {
      setError('Please enter a reason for being Away.')
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

  async function goWorking() {
    setSubmitting(true)
    setError(null)
    const result = await onSetAvailability(true)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  return (
    <div
      className={cn(
        'glass-panel px-4 py-3',
        scope.isAvailable
          ? 'border-emerald-200/80 bg-emerald-50/70'
          : 'border-amber-300/80 bg-amber-50/80',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            {scope.isAvailable ? (
              <>
                <Sun className="h-4 w-4 text-emerald-700" strokeWidth={1.75} />
                Working — you can approve requests
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-amber-800" strokeWidth={1.75} />
                Away — approvals are read-only
              </>
            )}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">
            {scope.isAvailable
              ? 'Turn on Away when you are on leave. Superior wardens of your gender will handle new requests for your block.'
              : `Superior wardens are covering your block. Reason: ${scope.unavailableReason ?? '—'}`}
          </p>
        </div>

        {scope.isAvailable ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={submitting}
            onClick={() => {
              setShowReasonForm((v) => !v)
              setError(null)
            }}
          >
            Go Away
          </Button>
        ) : (
          <Button type="button" size="sm" disabled={submitting} onClick={() => void goWorking()}>
            Back to Working
          </Button>
        )}
      </div>

      {showReasonForm && scope.isAvailable && (
        <div className="mt-3 space-y-2 border-t border-amber-200/70 pt-3">
          <Label htmlFor="away-reason">Reason for Away / leave</Label>
          <textarea
            id="away-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. On leave until Monday, medical, conference…"
            className="flex w-full rounded-xl border border-white/55 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={submitting} onClick={() => void goAway()}>
              Confirm Away
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={submitting}
              onClick={() => {
                setShowReasonForm(false)
                setReason('')
                setError(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-[#DC2626]">{error}</p>}
    </div>
  )
}
