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
      <div className="flex h-[45%] min-h-0 flex-col bg-white animate-[slideUpFull_0.3s_ease-out]">
        <div className="bg-[#DC2626] px-4 py-3 text-center text-lg font-bold text-white">
          ✗ INVALID PASS — DO NOT ALLOW
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <p className="text-center text-lg text-[#991B1B]">{result.reason}</p>
          <button
            type="button"
            onClick={onScanAgain}
            className="h-14 w-full max-w-md rounded-lg bg-[#1A5CA0] text-base font-semibold text-white"
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
      <div className="flex h-[45%] min-h-0 flex-col bg-[#EBF7EE] animate-[slideUpFull_0.3s_ease-out]">
        <div className="bg-[#D97706] px-4 py-3 text-center text-lg font-bold text-white">
          ⚠ OVERDUE — ALERT WARDEN
        </div>
        <PassDetails
          regNo={regNo}
          studentName={studentName}
          room={room}
          destination={pass.destination}
          returnBy={pass.return_by}
          passType={pass.pass_type}
        />
        <div className="mt-auto border-t border-[#D1D5DB] p-4">
          <button
            type="button"
            disabled={submitting}
            onClick={onAlertWarden}
            className="h-14 w-full rounded-lg bg-[#D97706] text-base font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Sending alert…' : 'Alert Warden'}
          </button>
        </div>
      </div>
    )
  }

  const nextAction = result.nextAction ?? 'exit'
  const allowLabel = nextAction === 'exit' ? 'EXIT' : 'ENTRY'

  return (
    <div className="flex h-[45%] min-h-0 flex-col bg-[#EBF7EE] animate-[slideUpFull_0.3s_ease-out]">
      <div className="bg-[#2E8B44] px-4 py-3 text-center text-lg font-bold text-white">
        ✓ OUTPASS VERIFIED — ALLOW {allowLabel}
      </div>
      <PassDetails
        regNo={regNo}
        studentName={studentName}
        room={room}
        destination={pass.destination}
        returnBy={pass.return_by}
        passType={pass.pass_type}
      />
      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-[#D1D5DB] p-4">
        <button
          type="button"
          disabled={submitting || hasExit}
          onClick={onRecordExit}
          className={cn(
            'h-14 rounded-lg text-base font-semibold text-white disabled:cursor-not-allowed',
            !hasExit && nextAction === 'exit'
              ? 'bg-[#1A5CA0]'
              : 'bg-[#9CA3AF]',
          )}
        >
          Record EXIT
        </button>
        <button
          type="button"
          disabled={submitting || !hasExit}
          onClick={onRecordEntry}
          className={cn(
            'h-14 rounded-lg text-base font-semibold text-white disabled:cursor-not-allowed',
            hasExit && nextAction === 'entry'
              ? 'bg-[#2E8B44]'
              : 'bg-[#9CA3AF]',
          )}
        >
          Record ENTRY
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
      <p className="font-mono text-2xl font-bold text-[#1A1A2E]">{regNo}</p>
      <p className="text-xl font-semibold text-[#1A1A2E]">{studentName}</p>
      <p className="text-base text-[#4B5563]">{room}</p>
      <p className="text-base text-[#1A1A2E]">
        <span className="text-[#4B5563]">Destination: </span>
        {destination}
      </p>
      <div className="flex items-center gap-2 text-base font-medium text-[#1A1A2E]">
        <Clock className="h-4 w-4 text-[#4B5563]" strokeWidth={1.75} />
        Return by {formatReturnTime(returnBy)}
      </div>
      <PassTypeBadge type={passType} />
    </div>
  )
}
