import { Clock, MapPin, FileText, LogIn, LogOut } from 'lucide-react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PASS_TYPE_LABELS, formatReturnTime, formatTableDateTime } from '@/lib/outpass'
import { formatOverdueDuration } from '@/lib/pass-filters'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import type { ScanValidationResult } from '@/lib/security-actions'
import { hasExitLog } from '@/lib/security-actions'
import { getStudentName, formatStudentRoomDisplay } from '@/lib/warden'
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
      className: 'bg-gradient-to-r from-[#1A5CA0] to-[#164a85]',
    }
  }

  if (result.kind === 'valid') {
    if (result.extensionApproved) {
      return {
        text: 'Extension approved — allow entry',
        className: 'bg-gradient-to-r from-emerald-600 to-emerald-700',
      }
    }
    return {
      text: 'Returning on time — allow entry',
      className: 'bg-gradient-to-r from-emerald-600 to-emerald-700',
    }
  }

  if (result.kind === 'late-entry') {
    const lateBy = result.overdueMs ? formatOverdueDuration(result.overdueMs) : ''
    return {
      text: lateBy ? `Late return (${lateBy}) — allow entry` : 'Late return — allow entry',
      className: 'bg-gradient-to-r from-amber-600 to-amber-700',
    }
  }

  if (result.kind === 'overdue-entry') {
    const lateBy = result.overdueMs ? formatOverdueDuration(result.overdueMs) : '12+ hours'
    if (result.extensionPending) {
      return {
        text: `Severely overdue (${lateBy}) — extension pending, warden notified`,
        className: 'bg-gradient-to-r from-red-600 to-red-700',
      }
    }
    return {
      text: `Severely overdue (${lateBy}) — no approved extension, warden notified`,
      className: 'bg-gradient-to-r from-red-600 to-red-700',
    }
  }

  return { text: 'Outpass verified', className: 'bg-gradient-to-r from-emerald-600 to-emerald-700' }
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
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-center text-sm font-bold text-white sm:text-base">
          Invalid pass — do not allow
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-6 sm:px-5">
          <p className="text-center text-sm font-medium leading-relaxed text-red-800 sm:text-base">
            {result.reason}
          </p>
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
  const room = formatStudentRoomDisplay(pass.students)
  const displayName = studentName !== 'Unknown' ? studentName : '—'
  const banner = getBanner(result)
  const isLateEntry = result.kind === 'late-entry' || result.kind === 'overdue-entry'
  const displayStatus = getPassDisplayStatus(pass, gateLogs)
  const statusLabel = getPassStatusLabel(pass.status, gateLogs, pass)
  const exitLog = gateLogs.find((log) => log.event_type === 'exit')
  const entryLog = gateLogs.find((log) => log.event_type === 'entry')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden animate-[slideUpFull_0.3s_ease-out]">
      <div
        className={cn(
          'px-3 py-3 text-center text-sm font-bold leading-snug text-white sm:px-4 sm:text-base',
          banner.className,
        )}
      >
        {banner.text}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:space-y-4 sm:px-4 sm:py-4">
        <div className="security-identity-card flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
              {displayName}
            </p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-[#1A5CA0] sm:text-lg">
              {admissionNo}
            </p>
            <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">{room}</p>
          </div>
          <StatusBadge status={displayStatus} label={statusLabel} />
        </div>

        {isExitScan && (
          <div className="rounded-xl border border-[#1A5CA0]/25 bg-gradient-to-br from-[#1A5CA0]/10 to-[#1A5CA0]/5 p-3 text-sm text-slate-800">
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

        <div className="grid gap-2 rounded-xl border border-slate-200/70 bg-white/70 p-3 text-sm shadow-sm">
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
              ? (
                <>
                  <span className="sm:hidden">Record exit</span>
                  <span className="hidden sm:inline">Record exit — allow student to leave</span>
                </>
              )
              : result.kind === 'overdue-entry'
                ? (
                  <>
                    <span className="sm:hidden">Record entry (warden notified)</span>
                    <span className="hidden sm:inline">Record entry — allow student to return (warden notified)</span>
                  </>
                )
                : (
                  <>
                    <span className="sm:hidden">Record entry</span>
                    <span className="hidden sm:inline">Record entry — allow student to return</span>
                  </>
                )}
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
