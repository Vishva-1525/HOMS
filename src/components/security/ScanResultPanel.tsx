import { Clock } from 'lucide-react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { formatReturnTime } from '@/lib/outpass'
import type { ScanValidationResult } from '@/lib/security-actions'
import { getStudentName, getStudentReg, getStudentRoom } from '@/lib/warden'
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
  const hasExit = result.gateLogs?.some((log) => log.event_type === 'exit') ?? false

  if (result.kind === 'invalid') {
    return (
      <div className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden border-t border-slate-200/80 animate-[slideUpFull_0.3s_ease-out]">
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
  const regNo = getStudentReg(pass.students)
  const room = getStudentRoom(pass.students)

  if (result.kind === 'overdue') {
    return (
      <div className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden border-t border-slate-200/80 animate-[slideUpFull_0.3s_ease-out]">
        <div className="bg-amber-600 px-4 py-3 text-center text-base font-bold text-white sm:text-lg">
          Overdue — alert warden
        </div>
        <PassDetails
          regNo={regNo}
          studentName={studentName}
          room={room}
          destination={pass.destination}
          returnBy={pass.return_by}
          passType={pass.pass_type}
        />
        <div className="mt-auto border-t border-slate-200/80 p-4">
          <button
            type="button"
            disabled={submitting}
            onClick={onAlertWarden}
            className="h-14 w-full rounded-xl bg-amber-600 text-base font-semibold text-white shadow-md disabled:opacity-50"
          >
            {submitting ? 'Sending alert…' : 'Alert warden'}
          </button>
        </div>
      </div>
    )
  }

  const nextAction = result.nextAction ?? 'exit'
  const allowLabel = nextAction === 'exit' ? 'EXIT' : 'ENTRY'

  return (
    <div className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden border-t border-slate-200/80 animate-[slideUpFull_0.3s_ease-out]">
      <div className="bg-emerald-600 px-4 py-3 text-center text-base font-bold text-white sm:text-lg">
        Outpass verified — allow {allowLabel}
      </div>
      <PassDetails
        regNo={regNo}
        studentName={studentName}
        room={room}
        destination={pass.destination}
        returnBy={pass.return_by}
        passType={pass.pass_type}
      />
      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-200/80 p-4">
        <button
          type="button"
          disabled={submitting || hasExit}
          onClick={onRecordExit}
          className={cn(
            'h-14 rounded-xl text-base font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60',
            !hasExit && nextAction === 'exit' ? 'bg-[#1A5CA0] hover:bg-[#164a85]' : 'bg-slate-400',
          )}
        >
          Record exit
        </button>
        <button
          type="button"
          disabled={submitting || !hasExit}
          onClick={onRecordEntry}
          className={cn(
            'h-14 rounded-xl text-base font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60',
            hasExit && nextAction === 'entry' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400',
          )}
        >
          Record entry
        </button>
      </div>
    </div>
  )
}

function PassDetails({
  regNo,
  studentName,
  room,
  destination,
  returnBy,
  passType,
}: {
  regNo: string
  studentName: string
  room: string
  destination: string
  returnBy: string
  passType: import('@/lib/types').PassType
}) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
      <p className="font-mono text-2xl font-bold tabular-nums text-slate-900">{regNo}</p>
      <p className="text-xl font-semibold text-slate-900">{studentName}</p>
      <p className="text-base text-slate-600">{room}</p>
      <p className="text-base text-slate-900">
        <span className="text-slate-600">Destination: </span>
        {destination}
      </p>
      <div className="flex items-center gap-2 text-base font-medium text-slate-900">
        <Clock className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
        Return by {formatReturnTime(returnBy)}
      </div>
      <PassTypeBadge type={passType} />
    </div>
  )
}
