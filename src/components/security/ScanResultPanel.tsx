import { useEffect, useState, type ReactNode } from 'react'
import { Camera, Clock, MapPin, User } from 'lucide-react'
import { GateCheckpointProgress } from '@/components/shared/GateCheckpointProgress'
import { StudentAvatar } from '@/components/shared/StudentAvatar'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  GATE_CHECKPOINT_LABELS,
  GATE_CHECKPOINTS,
  getCheckpointFromLog,
  type GateCheckpoint,
} from '@/lib/gate-checkpoints'
import { formatReturnTime, formatTableDateTime } from '@/lib/outpass'
import { formatOverdueDuration } from '@/lib/pass-filters'
import { isMultiDailyScanPass } from '@/lib/pass-multi-scan'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import type { ScanValidationResult } from '@/lib/security-actions'
import { checkpointLabel } from '@/lib/security-actions'
import { getStudentAvatarUrl, getStudentName } from '@/lib/warden'
import { cn } from '@/lib/utils'

function ScanStudentPhoto({
  name,
  photoUrl,
}: {
  name: string
  photoUrl: string | null
}) {
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [photoUrl])

  const showPhoto = Boolean(photoUrl) && !imgFailed

  return (
    <div className="mx-auto w-full max-w-[180px] shrink-0 sm:mx-0">
      <div className="overflow-hidden rounded-2xl border-2 border-[var(--glass-border)] bg-slate-100 shadow-md ring-2 ring-[#1A5CA0]/20">
        {showPhoto && photoUrl ? (
          <img
            src={photoUrl}
            alt={`Photo of ${name}`}
            onError={() => setImgFailed(true)}
            className="aspect-[4/5] w-full object-cover object-top"
          />
        ) : (
          <div
            className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1A5CA0] to-[#0D3F72] text-white"
            aria-hidden
          >
            <User className="h-12 w-12 opacity-90" strokeWidth={1.75} />
            <span className="px-3 text-center text-sm font-semibold leading-tight">
              {name !== '-' ? name.split(/\s+/).slice(0, 2).join(' ') : 'No photo'}
            </span>
          </div>
        )}
      </div>
      <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <Camera className="h-3 w-3" aria-hidden />
        {showPhoto ? 'Student photo' : 'Photo unavailable'}
      </p>
    </div>
  )
}

interface ScanResultPanelProps {
  result: ScanValidationResult | null
  visible: boolean
  submitting: boolean
  onRecordCheckpoint: () => void
  onAlertWarden: () => void
  onScanAgain: () => void
  /** @deprecated */
  onRecordExit?: () => void
  /** @deprecated */
  onRecordEntry?: () => void
}

function getVerificationResult(result: ScanValidationResult): {
  label: string
  detail: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
} {
  if (result.kind === 'duplicate-checkpoint' || result.kind === 'cycle-complete') {
    return {
      label: result.kind === 'cycle-complete' ? 'Trip complete' : 'Duplicate scan',
      detail: result.reason ?? 'This checkpoint was already scanned.',
      tone: 'warning',
    }
  }

  if (result.kind === 'out-of-sequence') {
    return {
      label: 'Out of sequence',
      detail: result.reason ?? 'Scan the previous checkpoint first.',
      tone: 'danger',
    }
  }

  if (result.kind === 'invalid') {
    return {
      label: 'Verification failed',
      detail: result.reason ?? 'Invalid pass.',
      tone: 'danger',
    }
  }

  const next = result.nextCheckpoint
  if (next && (result.kind === 'valid' || result.kind === 'late-entry' || result.kind === 'overdue-entry')) {
    if (result.kind === 'late-entry') {
      return {
        label: `Late - ${GATE_CHECKPOINT_LABELS[next]}`,
        detail: result.overdueMs
          ? `${formatOverdueDuration(result.overdueMs)} past return time.`
          : 'Past scheduled return time.',
        tone: 'warning',
      }
    }
    if (result.kind === 'overdue-entry') {
      return {
        label: `Overdue - ${GATE_CHECKPOINT_LABELS[next]}`,
        detail: result.wardenNotified
          ? 'Severely overdue - warden notified.'
          : 'Severely overdue - notify warden if needed.',
        tone: 'danger',
      }
    }
    return {
      label: `${GATE_CHECKPOINT_LABELS[next]} allowed`,
      detail: `Verify identity and record ${GATE_CHECKPOINT_LABELS[next]}.`,
      tone: 'success',
    }
  }

  return {
    label: 'Ready',
    detail: 'Verify the student and continue.',
    tone: 'neutral',
  }
}

const toneStyles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-900',
  neutral: 'border-slate-200 bg-slate-50 text-slate-900',
} as const

const bannerStyles = {
  success: 'bg-gradient-to-r from-emerald-600 to-emerald-700',
  warning: 'bg-gradient-to-r from-amber-600 to-amber-700',
  danger: 'bg-gradient-to-r from-red-600 to-red-700',
  neutral: 'bg-gradient-to-r from-[#1A5CA0] to-[#164a85]',
} as const

export function ScanResultPanel({
  result,
  visible,
  submitting,
  onRecordCheckpoint,
  onAlertWarden,
  onScanAgain,
  onRecordExit,
  onRecordEntry,
}: ScanResultPanelProps) {
  if (!result || !visible) return null

  const record = onRecordCheckpoint ?? onRecordExit ?? onRecordEntry ?? (() => {})
  const pass = result.pass
  const gateLogs = result.gateLogs ?? []
  const scannerNames = result.scannerNames ?? {}
  const verification = getVerificationResult(result)
  const isBlocked =
    result.kind === 'invalid'
    || result.kind === 'duplicate-checkpoint'
    || result.kind === 'out-of-sequence'
    || result.kind === 'cycle-complete'

  const photoUrl = pass ? getStudentAvatarUrl(pass.students) : null

  if (isBlocked) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden animate-[slideUpFull_0.3s_ease-out]">
        <div
          className={cn(
            'px-4 py-3 text-center text-sm font-bold text-white sm:text-base',
            bannerStyles[verification.tone],
          )}
        >
          {verification.label}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-6 sm:px-5">
          {pass && (
            <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-slate-200/80 bg-[var(--glass-bg)] p-4">
              <StudentAvatar
                name={getStudentName(pass.students)}
                photoUrl={photoUrl}
                size="lg"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {getStudentName(pass.students)}
                </p>
                <p className="font-mono text-sm text-[#1A5CA0]">
                  {result.studentAdmissionNo ?? '-'}
                </p>
              </div>
            </div>
          )}
          {pass && (
            <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-[var(--glass-bg)] p-3">
              <GateCheckpointProgress
                passId={pass.id}
                gateLogs={gateLogs}
                multiDaily={isMultiDailyScanPass(pass)}
              />
            </div>
          )}
          <div
            className={cn(
              'w-full max-w-md rounded-xl border px-4 py-3 text-center text-sm font-medium',
              toneStyles[verification.tone],
            )}
          >
            {verification.detail}
          </div>
          <button
            type="button"
            onClick={onScanAgain}
            className="security-action-btn max-w-md bg-[#1A5CA0] hover:bg-[#164a85]"
          >
            Scan again
          </button>
        </div>
      </div>
    )
  }

  if (!pass) return null

  const studentName = getStudentName(pass.students)
  const admissionNo = result.studentAdmissionNo ?? '-'
  const displayName = studentName !== 'Unknown' ? studentName : '-'
  const nextCheckpoint = result.nextCheckpoint
  const displayStatus = getPassDisplayStatus(pass, gateLogs)
  const statusLabel = getPassStatusLabel(pass.status, gateLogs, pass)
  const multi = isMultiDailyScanPass(pass)
  const isExitLeg =
    nextCheckpoint === 'hostel_exit' || nextCheckpoint === 'main_exit'

  const logsByCheckpoint = new Map<GateCheckpoint, (typeof gateLogs)[number]>()
  for (const log of gateLogs) {
    const cp = getCheckpointFromLog(log)
    if (cp && !logsByCheckpoint.has(cp)) logsByCheckpoint.set(cp, log)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden animate-[slideUpFull_0.3s_ease-out]">
      <div
        className={cn(
          'px-3 py-3 text-center text-sm font-bold leading-snug text-white sm:px-4 sm:text-base',
          isExitLeg ? bannerStyles.neutral : bannerStyles[verification.tone],
        )}
      >
        {nextCheckpoint
          ? `Now scanning: ${GATE_CHECKPOINT_LABELS[nextCheckpoint]}`
          : verification.label}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:space-y-4 sm:px-4 sm:py-4">
        <div className="security-identity-card flex flex-col gap-4 sm:flex-row sm:items-center">
          <ScanStudentPhoto name={displayName} photoUrl={photoUrl} />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="truncate text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
              {displayName}
            </p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-[#1A5CA0] sm:text-lg">
              {admissionNo}
            </p>
            <div className="mt-2 flex justify-center sm:justify-start">
              <StatusBadge status={displayStatus} label={statusLabel} />
            </div>
          </div>
        </div>

        <div className={cn('rounded-xl border p-3 text-sm', toneStyles[verification.tone])}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            Verification result
          </p>
          <p className="mt-1 font-semibold">{verification.label}</p>
          <p className="mt-0.5 opacity-90">{verification.detail}</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-[var(--glass-bg)] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Gate progress
          </p>
          <GateCheckpointProgress passId={pass.id} gateLogs={gateLogs} multiDaily={multi} />
        </div>

        <div className="grid gap-2 rounded-xl border border-slate-200/70 bg-[var(--glass-bg)] p-3 text-sm shadow-sm">
          <DetailRow icon={MapPin} label="Destination" value={pass.destination} />
          <DetailRow
            icon={Clock}
            label="Return time"
            value={formatReturnTime(pass.return_by)}
            valueClassName={
              result.kind === 'late-entry' || result.kind === 'overdue-entry'
                ? 'text-amber-700 font-semibold'
                : undefined
            }
          />
          <DetailRow icon={Clock} label="Departure" value={formatTableDateTime(pass.departure_at)} />
          <DetailRow label="Pass type" value={<PassTypeBadge type={pass.pass_type} />} />
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scan history</p>
          <div className="mt-2 space-y-2">
            {GATE_CHECKPOINTS.map((cp) => {
              const log = logsByCheckpoint.get(cp)
              return (
                <HistoryRow
                  key={cp}
                  label={GATE_CHECKPOINT_LABELS[cp]}
                  time={log?.scanned_at}
                  scanner={log ? scannerNames[log.scanned_by] : undefined}
                  recorded={Boolean(log)}
                  current={nextCheckpoint === cp}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-2.5 border-t border-slate-200/80 bg-[var(--glass-bg)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:space-y-3 sm:p-4">
        <button
          type="button"
          disabled={submitting || !nextCheckpoint}
          onClick={record}
          className={cn(
            'security-action-btn',
            isExitLeg
              ? 'bg-[#1A5CA0] hover:bg-[#164a85]'
              : 'bg-emerald-600 hover:bg-emerald-700',
          )}
        >
          {submitting
            ? 'Recording…'
            : nextCheckpoint
              ? `Record ${checkpointLabel(nextCheckpoint)}`
              : 'No scan required'}
        </button>

        {result.kind === 'overdue-entry' && !result.wardenNotified && (
          <button
            type="button"
            disabled={submitting}
            onClick={onAlertWarden}
            className="h-12 w-full rounded-xl border-2 border-red-600 bg-white text-sm font-semibold text-red-700 disabled:opacity-50"
          >
            {submitting ? 'Sending alert…' : 'Notify warden again'}
          </button>
        )}

        <button
          type="button"
          onClick={onScanAgain}
          className="w-full py-1 text-center text-xs font-medium text-slate-600 underline underline-offset-2"
        >
          Cancel and scan again
        </button>
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon?: typeof MapPin
  label: string
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex gap-2">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />}
      <div className={cn('min-w-0 flex-1', !Icon && 'pl-6')}>
        <span className="text-slate-500">{label}: </span>
        <span className={cn('text-slate-900', valueClassName)}>{value}</span>
      </div>
    </div>
  )
}

function HistoryRow({
  label,
  time,
  scanner,
  recorded,
  current,
}: {
  label: string
  time?: string
  scanner?: string
  recorded: boolean
  current?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-2 rounded-lg px-2 py-1.5',
        current && 'bg-[#EBF3FF] ring-1 ring-[#1A5CA0]/25',
        recorded && !current && 'bg-emerald-50/80',
      )}
    >
      <div className="min-w-0">
        <p className={cn('text-sm font-medium', recorded ? 'text-slate-900' : 'text-slate-500')}>
          {recorded ? '✓ ' : current ? '⏳ ' : '○ '}
          {label}
        </p>
        {scanner && <p className="text-[11px] text-slate-500">by {scanner}</p>}
      </div>
      <p className="shrink-0 text-xs text-slate-600">
        {time ? formatTableDateTime(time) : current ? 'Next' : 'Pending'}
      </p>
    </div>
  )
}
