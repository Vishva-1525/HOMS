import { PASS_TYPE_LABELS, formatReturnTime } from '@/lib/outpass'
import { getStudentName, getStudentReg, getStudentRoom } from '@/lib/warden'
import type { OutpassWithStudent } from '@/lib/types'

export function PassRequestDetails({ request }: { request: OutpassWithStudent }) {
  const student = request.students

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Student</dt>
        <dd className="font-medium">{getStudentName(student)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Reg No</dt>
        <dd className="font-medium">{getStudentReg(student)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Room</dt>
        <dd className="font-medium">{getStudentRoom(student)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Pass type</dt>
        <dd className="font-medium">{PASS_TYPE_LABELS[request.pass_type]}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Destination</dt>
        <dd className="text-right font-medium">{request.destination}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Reason</dt>
        <dd className="text-right font-medium">{request.reason}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Departure</dt>
        <dd className="font-medium">{formatReturnTime(request.departure_at)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Return by</dt>
        <dd className="font-medium">{formatReturnTime(request.return_by)}</dd>
      </div>
    </dl>
  )
}
