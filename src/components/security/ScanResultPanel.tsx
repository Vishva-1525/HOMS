import { Clock, MapPin, FileText, LogIn, LogOut } from 'lucide-react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PASS_TYPE_LABELS, formatReturnTime, formatTableDateTime } from '@/lib/outpass'
import { formatOverdueDuration } from '@/lib/pass-filters'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import type { ScanValidationResult } from '@/lib/security-actions'
import { hasExitLog } from '@/lib/security-actions'
import { getStudentName, formatStudentVerificationLabel, formatStudentRoomDisplay } from '@/lib/warden'
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

function getBanner(result: ScanValidationResult): { text: string; className: string } {
  if (result.scanPhase === 'exit') {
    return {
      text: 'Exiting college — allow student to leave',
      className: 'bg-[#1A5CA0]',
    }
  }

  if (result.kind === 'valid') {
    if (result.extensionApproved) {
      return {
        text: 'Extension approved — allow entry',
        className: 'bg-emerald-600',
      }
    }
    return {
      text: 'Returning on time — allow entry',
      className: 'bg-emerald-600',
    }
  }

  if (result.kind === 'late-entry') {
    const lateBy = result.overdueMs ? formatOverdueDuration(result.overdueMs) : ''
    return {
      text: lateBy ? `Late return (${lateBy}) — allow entry` : 'Late return — allow entry',
      className: 'bg-amber-600',
    }
  }

  if (result.kind === 'overdue-entry') {
    const lateBy = result.overdueMs ? formatOverdueDuration(result.overdueMs) : '12+ hours'
    if (result.extensionPending) {
      return {
        text: `Severely overdue (${lateBy}) — extension pending, warden notified`,
        className: 'bg-red-600',
      }
    }
    return {
      text: `Severely overdue (${lateBy}) — no approved extension, warden notified`,
      className: 'bg-red-600',
    }
  }

  return { text: 'Outpass verified', className: 'bg-emerald-600' }
}

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
  const hasExit = hasExitLog(pass?.id ?? '', gateLogs)
  const nextAction = result.nextAction ?? 'exit'
  const isExitScan = result.scanPhase === 'exit'

  if (result.kind === 'invalid') {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden animate-[slideUpFull_0.3s_ease-out]">
        <div className="bg-red-600 px-4 py-3 text-center text-base font-bold text-white sm:text-lg">
          Invalid pass — do not allow
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-6">
          <p className="text-center text-base font-medium text-red-800 sm:text-lg">{result.reason}</p>
          <button
            type="button"
            onClick={onScanAgain}
            className="h-14 w-full max-w-md rounded-xl bg-[#1A5CA0] text-base font-semibold text-white shadow-md transition-colors hover:bg-[#164a85]"
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
  const room = formatStudentRoomDisplay(pass.students)
  const verificationLabel = formatStudentVerificationLabel(studentName, result.studentAdmissionNo)
  const banner = getBanner(result)
  const isLateEntry = result.kind === 'late-entry' || result.kind === 'overdue-entry'
  const displayStatus = getPassDisplayStatus(pass, gateLogs)
  const statusLabel = getPassStatusLabel(pass.status, gateLogs, pass)
  const exitLog = gateLogs.find((log) => log.event_type === 'exit')
  const entryLog = gateLogs.find((log) => log.event_type === 'entry')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden animate-[slideUpFull_0.3s_ease-out]">
      <div className={cn('px-4 py-3 text-center text-base font-bold text-white sm:text-lg', banner.className)}>
        {banner.text}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-2xl font-bold tabular-nums text-slate-900">{admissionNo}</p>
            <p className="mt-1 text-xl font-semibold leading-snug text-slate-900">{verificationLabel}</p>
            <p className="mt-0.5 text-sm text-slate-600">{room}</p>
          </div>
          <StatusBadge status={displayStatus} label={statusLabel} />
        </div>

        {isExitScan && (
          <div className="rounded-xl border border-[#1A5CA0]/30 bg-[#1A5CA0]/10 p-3 text-sm text-slate-800">
            <p className="font-medium text-[#1A5CA0]">First scan — college exit</p>
            <p className="mt-1 text-slate-600">
              Verify the student&apos;s ID, then record exit. The same QR will be scanned again when they return.
            </p>
          </div>
        )}

        {!isExitScan && isLateEntry && (
          <div
            className={cn(
              'rounded-xl border p-3 text-sm',
              result.kind === 'overdue-entry'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-amber-200 bg-amber-50 text-amber-900',
            )}
          >
            <p className="font-medium">
              {result.kind === 'overdue-entry' ? 'Severely overdue return' : 'Late return'}
            </p>
            <p className="mt-1">
              Return was due {formatReturnTime(pass.return_by)}
              {result.overdueMs ? ` · ${formatOverdueDuration(result.overdueMs)} late` : ''}.
            </p>
            {result.extensionApproved && (
              <p className="mt-1 text-emerald-800">Approved extension covers this return window.</p>
            )}
            {result.extensionPending && (
              <p className="mt-1">Extension request is pending warden approval.</p>
            )}
            {result.kind === 'overdue-entry' && result.wardenNotified && (
              <p className="mt-1 font-medium">Warden has been notified automatically.</p>
            )}
          </div>
        )}

        <div className="grid gap-2 rounded-xl border border-slate-200/80 bg-white/60 p-3 text-sm">
          <DetailRow icon={MapPin} label="Destination" value={pass.destination} />
          <DetailRow icon={FileText} label="Reason" value={pass.reason} />
          <DetailRow
            icon={Clock}
            label="Departure"
            value={formatTableDateTime(pass.departure_at)}
          />
          <DetailRow
            icon={Clock}
            label="Return by"
            value={formatReturnTime(pass.return_by)}
            valueClassName={isLateEntry ? 'text-amber-700 font-semibold' : undefined}
            suffix={isLateEntry ? '(late)' : undefined}
          />
          <DetailRow label="Pass type" value={PASS_TYPE_LABELS[pass.pass_type]} />
          <DetailRow label="Pass ID" value={`${pass.id.slice(0, 8)}…`} mono />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PassTypeBadge type={pass.pass_type} />
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
            {pass.status}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gate status</p>
          <div className="mt-2 space-y-1.5">
            <GateStatusRow
              icon={LogOut}
              label="Exit"
              recorded={hasExit}
              time={exitLog?.scanned_at}
            />
            <GateStatusRow
              icon={LogIn}
              label="Entry"
              recorded={Boolean(entryLog)}
              time={entryLog?.scanned_at}
            />
          </div>
          <p className="dashboard-muted mt-2 text-xs">
            Scan {isExitScan ? '1 of 2' : '2 of 2'} —{' '}
            <strong className="text-slate-800">
              {nextAction === 'exit' ? 'Record exit' : 'Record entry'}
            </strong>
          </p>
        </div>
      </div>

      <div className="mt-auto space-y-3 border-t border-slate-200/80 p-4">
        <button
          type="button"
          disabled={submitting || (nextAction === 'exit' ? hasExit : !hasExit)}
          onClick={nextAction === 'exit' ? onRecordExit : onRecordEntry}
          className={cn(
            'h-14 w-full rounded-xl text-base font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60',
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
                ? 'Record entry — allow student to return (warden notified)'
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

        {!isExitScan && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled
              className="h-11 rounded-xl bg-slate-300 text-sm font-semibold text-white"
            >
              Exit ✓
            </button>
            <button
              type="button"
              disabled={submitting || !hasExit}
              onClick={onRecordEntry}
              className={cn(
                'h-11 rounded-xl text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60',
                hasExit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400',
              )}
            >
              Entry
            </button>
          </div>
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
  suffix,
  mono,
}: {
  icon?: typeof MapPin
  label: string
  value: string
  valueClassName?: string
  suffix?: string
  mono?: boolean
}) {
  return (
    <div className="flex gap-2">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />}
      <div className={cn('min-w-0 flex-1', !Icon && 'pl-6')}>
        <span className="text-slate-500">{label}: </span>
        <span className={cn('text-slate-900', mono && 'font-mono text-xs', valueClassName)}>
          {value}
        </span>
        {suffix && <span className="ml-1 text-amber-700">{suffix}</span>}
      </div>
    </div>
  )
}

function GateStatusRow({
  icon: Icon,
  label,
  recorded,
  time,
}: {
  icon: typeof LogOut
  label: string
  recorded: boolean
  time?: string
}) {
  return (
    <div className="flex items-center gap-2 text-slate-800">
      <Icon className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
      <span className="font-medium">{label}:</span>
      {recorded && time ? (
        <span className="text-emerald-700">Recorded at {formatReturnTime(time)}</span>
      ) : (
        <span className="text-slate-500">Not recorded</span>
      )}
    </div>
  )
}
