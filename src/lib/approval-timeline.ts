import type { GateLog, OutpassRequest } from '@/lib/types'

export type TimelineStageState = 'completed' | 'current' | 'pending'

export interface ApprovalTimelineStage {
  id: string
  label: string
  state: TimelineStageState
  detail?: string
}

export function buildApprovalTimeline(
  pass: OutpassRequest,
  gateLogs: GateLog[] = [],
): ApprovalTimelineStage[] {
  const isSpecial = pass.pass_type === 'special_pass' || pass.requires_hod_approval
  const submitted = true
  const isPending = pass.status === 'pending'
  const isRejected = pass.status === 'rejected'
  const isApproved = pass.status === 'approved' || pass.status === 'extended'
  const hasQr = Boolean(pass.qr_code_data)
  const hasExit = gateLogs.some((l) => l.event_type === 'exit')

  const stages: ApprovalTimelineStage[] = [
    {
      id: 'submitted',
      label: 'Submitted',
      state: submitted ? 'completed' : 'pending',
      detail: new Date(pass.created_at).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
    {
      id: 'rt_review',
      label: 'RT Review',
      state: isRejected
        ? 'completed'
        : isPending
          ? 'current'
          : isApproved
            ? 'completed'
            : 'pending',
      detail: isPending ? 'Under review by residential tutor' : undefined,
    },
  ]

  if (isSpecial) {
    stages.push({
      id: 'hod_approval',
      label: 'HOD Approval',
      state: isRejected
        ? 'completed'
        : isPending
          ? 'pending'
          : isApproved
            ? 'completed'
            : 'pending',
      detail: isPending ? 'Awaiting HOD approval' : isApproved ? 'HOD approved' : undefined,
    })
  }

  stages.push(
    {
      id: 'approved',
      label: 'Approved',
      state: isRejected
        ? 'pending'
        : isApproved
          ? 'completed'
          : isPending
            ? 'pending'
            : 'pending',
      detail:
        pass.approved_at && isApproved
          ? new Date(pass.approved_at).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : isRejected
            ? pass.warden_remark ?? 'Rejected'
            : undefined,
    },
    {
      id: 'qr_generated',
      label: 'QR Generated',
      state: hasQr ? 'completed' : isApproved ? 'current' : 'pending',
      detail: hasQr ? 'Ready for gate scan' : isApproved ? 'Generating QR…' : undefined,
    },
  )

  if (hasExit && isApproved) {
    stages.push({
      id: 'checked_out',
      label: 'Checked out',
      state: 'completed',
      detail: 'Exit scan recorded at gate',
    })
  }

  return stages
}
