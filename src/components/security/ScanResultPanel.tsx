import type { ReactNode } from 'react'
import { Clock, MapPin, LogIn, LogOut, User } from 'lucide-react'
import { StudentAvatar } from '@/components/shared/StudentAvatar'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatReturnTime, formatTableDateTime } from '@/lib/outpass'
import { formatOverdueDuration } from '@/lib/pass-filters'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import type { ScanValidationResult } from '@/lib/security-actions'
import { hasExitLog } from '@/lib/security-actions'
import { getStudentName } from '@/lib/warden'
import { cn } from '@/lib/utils'

interface ScanResultPanelProps {
  result: ScanValidationResult | null
  visible: boolean
  submitting: boolean
  onRecordExit: () => void
  onRecordEntry: () => void
  onAlertWarden: () => void
  onScanAgain: () => void
}

function getVerificationResult(result: ScanValidationResult): {
  label: string
  detail: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
} {
  if (result.kind === 'duplicate-exit') {
    return {
      label: 'Duplicate exit',
      detail: 'Student already exited.',
      tone: 'warning',
    }
  }

  if (result.kind === 'duplicate-entry') {
    return {
      label: 'Duplicate entry',
      detail: 'Student already entered.',
      tone: 'warning',
    }
  }

  if (result.kind === 'invalid') {
    return {
      label: 'Verification failed',
      detail: result.reason ?? 'Invalid pass.',
      tone: 'danger',
    }
  }

  if (result.scanPhase === 'exit') {
    return {
      label: 'Exit allowed',
      detail: 'Verify identity and record exit.',
      tone: 'success',
    }
  }

  if (result.kind === 'valid') {
    return {
      label: result.extensionApproved ? 'Entry allowed (extension)' : 'Entry allowed',
      detail: 'Student is returning on time.',
      tone: 'success',
    }
  }

  if (result.kind === 'late-entry') {
    return {
      label: 'Late entry',
      detail: result.overdueMs
        ? `${formatOverdueDuration(result.overdueMs)} past return time.`
        : 'Past scheduled return time.',
      tone: 'warning',
    }
  }

  return {
    label: 'Overdue entry',
    detail: result.wardenNotified
      ? 'Severely overdue — warden notified.'
      : 'Severely overdue — notify warden if needed.',
    tone: 'danger',
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
  onRecordExit,
  onRecordEntry,
  onAlertWarden,
  onScanAgain,
}: ScanResultPanelProps) {
  if (!result || !visible) return null

  const pass = result.pass
  const gateLogs = result.gateLogs ?? []
  const scannerNames = result.scannerNames ?? {}
  const verification = getVerificationResult(result)
  const isDuplicate =
    result.kind === 'duplicate-exit' || result.kind === 'duplicate-entry'

  if (result.kind === 'invalid' || isDuplicate) {
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
            <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-4">
              <StudentAvatar name={getStudentName(pass.students)} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {getStudentName(pass.students)}
                </p>
                <p className="font-mono text-sm text-[#1A5CA0]">
                  {result.studentAdmissionNo ?? '—'}
                </p>
              </div>
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
  const admissionNo = result.studentAdmissionNo ?? '—'
  const displayName = studentName !== 'Unknown' ? studentName : '—'
  const hasExit = hasExitLog(pass.id, gateLogs)
  const nextAction = result.nextAction ?? 'exit'
  const isExitScan = result.scanPhase === 'exit'
  const displayStatus = getPassDisplayStatus(pass, gateLogs)
  const statusLabel = getPassStatusLabel(pass.status, gateLogs, pass)
  const exitLog = gateLogs.find((log) => log.event_type === 'exit')
  const entryLog = gateLogs.find((log) => log.event_type === 'entry')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden animate-[slideUpFull_0.3s_ease-out]">
      <div
        className={cn(
          'px-3 py-3 text-center text-sm font-bold leading-snug text-white sm:px-4 sm:text-base',
          isExitScan ? bannerStyles.neutral : bannerStyles[verification.tone],
        )}
      >
        {isExitScan ? 'College exit — verify and allow departure' : verification.label}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:space-y-4 sm:px-4 sm:py-4">
        <div className="security-identity-card flex items-center gap-4">
          <StudentAvatar name={displayName} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
              {displayName}
            </p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-[#1A5CA0] sm:text-lg">
              {admissionNo}
            </p>
            <div className="mt-2">
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

        <div className="grid gap-2 rounded-xl border border-slate-200/70 bg-white/70 p-3 text-sm shadow-sm">
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
            <HistoryRow
              icon={LogOut}
              label="Exit scan"
              time={exitLog?.scanned_at}
              scanner={exitLog ? scannerNames[exitLog.scanned_by] : undefined}
              recorded={hasExit}
            />
            <HistoryRow
              icon={LogIn}
              label="Entry scan"
              time={entryLog?.scanned_at}
              scanner={entryLog ? scannerNames[entryLog.scanned_by] : undefined}
              recorded={Boolean(entryLog)}
            />
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-2.5 border-t border-slate-200/80 bg-white/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:space-y-3 sm:p-4">
        <button
          type="button"
          disabled={submitting || (nextAction === 'exit' ? hasExit : !hasExit)}
          onClick={nextAction === 'exit' ? onRecordExit : onRecordEntry}
          className={cn(
            'security-action-btn',
            nextAction === 'exit'
              ? 'bg-[#1A5CA0] hover:bg-[#164a85]'
              : 'bg-emerald-600 hover:bg-emerald-700',
          )}
        >
          {submitting
            ? 'Recording…'
            : nextAction === 'exit'
              ? 'Record exit — allow student to leave'
              : result.kind === 'overdue-entry'
                ? 'Record entry — warden notified'
                : 'Record entry — allow student to return'}
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
  icon: Icon,
  label,
  time,
  scanner,
  recorded,
}: {
  icon: typeof LogOut
  label: string
  time?: string
  scanner?: string
  recorded: boolean
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200/60 bg-white/80 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-slate-800">{label}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
              recorded ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600',
            )}
          >
            {recorded ? 'Done' : 'Pending'}
          </span>
        </div>
        {recorded && time ? (
          <>
            <p className="mt-0.5 text-xs text-slate-600">{formatReturnTime(time)}</p>
            {scanner && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <User className="h-3 w-3" />
                {scanner}
              </p>
            )}
          </>
        ) : (
          <p className="mt-0.5 text-xs text-slate-500">Not recorded</p>
        )}
      </div>
    </div>
  )
}
