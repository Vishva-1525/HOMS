import type { ReactNode } from 'react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MobileDataCard, MobileDataCardRow } from '@/components/ui/MobileDataCard'
import { Button } from '@/components/ui/button'
import { formatReturnTime } from '@/lib/outpass'
import { formatPassDuration, formatRelativeTime } from '@/lib/relative-time'
import {
  getExitTime,
  getStudentName,
  getStudentReg,
  getStudentRoom,
  isOverdueReturn,
} from '@/lib/warden'
import type { ExtensionWithOutpass, GateLog, OutpassWithStudent } from '@/lib/types'
import type { StatusBadgeStatus } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'

interface WardenPendingCardProps {
  pass: OutpassWithStudent
  onApprove: () => void
  onReject: () => void
}

export function WardenPendingMobileCard({ pass, onApprove, onReject }: WardenPendingCardProps) {
  return (
    <MobileDataCard>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{getStudentName(pass.students)}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {getStudentReg(pass.students)} · {getStudentRoom(pass.students)}
          </p>
        </div>
        <PassTypeBadge type={pass.pass_type} />
      </div>

      <p className="mt-2 text-sm font-medium text-slate-900">{pass.destination}</p>
      <p className="dashboard-muted mt-1 line-clamp-2 text-xs">{pass.reason}</p>

      <div className="mt-2 space-y-1">
        <MobileDataCardRow
          label="Duration"
          value={formatPassDuration(pass.departure_at, pass.return_by)}
        />
        <MobileDataCardRow label="Submitted" value={formatRelativeTime(pass.created_at)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" size="sm" onClick={onApprove}>
          Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-[#DC2626] hover:bg-[#FEF2F2]"
          onClick={onReject}
        >
          Reject
        </Button>
      </div>
    </MobileDataCard>
  )
}

interface WardenStudentOutCardProps {
  pass: OutpassWithStudent
  gateLogs: GateLog[]
  timeRemaining: ReactNode
}

export function WardenStudentOutMobileCard({
  pass,
  gateLogs,
  timeRemaining,
}: WardenStudentOutCardProps) {
  const overdue = isOverdueReturn(pass, gateLogs)
  const exit = getExitTime(pass.id, gateLogs)

  return (
    <MobileDataCard className={cn(overdue && 'bg-red-50/80')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{getStudentName(pass.students)}</p>
          <p className="mt-0.5 text-xs text-slate-600">{getStudentRoom(pass.students)}</p>
        </div>
        <StatusBadge status={overdue ? 'overdue' : 'approved'} label={overdue ? 'Overdue' : 'Out'} />
      </div>

      <p className="mt-2 text-sm font-medium text-slate-900">{pass.destination}</p>

      <div className="mt-2 space-y-1">
        <MobileDataCardRow label="Exit" value={exit ? formatReturnTime(exit) : '—'} />
        <MobileDataCardRow label="Return by" value={formatReturnTime(pass.return_by)} />
        <MobileDataCardRow label="Remaining" value={timeRemaining} />
      </div>
    </MobileDataCard>
  )
}

interface WardenExtensionCardProps {
  extension: ExtensionWithOutpass
  onApprove: () => void
  onReject: () => void
}

export function WardenExtensionMobileCard({
  extension,
  onApprove,
  onReject,
}: WardenExtensionCardProps) {
  const student = extension.outpass_requests?.students

  return (
    <MobileDataCard>
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{getStudentName(student)}</p>
        <p className="mt-0.5 text-xs text-slate-600">
          {getStudentReg(student)} · {getStudentRoom(student)}
        </p>
      </div>

      <div className="mt-2 space-y-1">
        <MobileDataCardRow
          label="Current return"
          value={
            extension.outpass_requests
              ? formatReturnTime(extension.outpass_requests.return_by)
              : '—'
          }
        />
        <MobileDataCardRow
          label="Requested"
          value={
            <span className="text-[#1A5CA0]">{formatReturnTime(extension.new_return_time)}</span>
          }
        />
        <MobileDataCardRow label="Reason" value={extension.reason} />
        <MobileDataCardRow label="Submitted" value={formatRelativeTime(extension.created_at)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" size="sm" onClick={onApprove}>
          Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-[#DC2626] hover:bg-[#FEF2F2]"
          onClick={onReject}
        >
          Reject
        </Button>
      </div>
    </MobileDataCard>
  )
}

interface WardenReportCardProps {
  pass: OutpassWithStudent
  status: StatusBadgeStatus
  entryTime?: string | null
}

export function WardenReportMobileCard({
  pass,
  status,
  entryTime,
}: WardenReportCardProps) {
  return (
    <MobileDataCard>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{getStudentName(pass.students)}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {getStudentReg(pass.students)} · {getStudentRoom(pass.students)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <PassTypeBadge type={pass.pass_type} />
          <StatusBadge status={status} />
        </div>
      </div>

      <p className="mt-2 text-sm font-medium text-slate-900">{pass.destination}</p>

      <div className="mt-2 space-y-1">
        <MobileDataCardRow label="Departure" value={formatReturnTime(pass.departure_at)} />
        <MobileDataCardRow label="Return by" value={formatReturnTime(pass.return_by)} />
        <MobileDataCardRow label="Entry" value={entryTime ? formatReturnTime(entryTime) : '—'} />
        {pass.warden_remark && (
          <MobileDataCardRow label="Remark" value={pass.warden_remark} />
        )}
      </div>
    </MobileDataCard>
  )
}
