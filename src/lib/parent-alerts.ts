import { formatOverdueDuration, hasEntryLog, isPassOverdue } from '@/lib/pass-filters'
import { PASS_TYPE_LABELS, formatReturnTime, formatTableDateTime } from '@/lib/outpass'
import type { ExtensionRequest, GateLog, OutpassRequest } from '@/lib/types'
import { getExitTime, getEntryTime, isStudentCurrentlyOut } from '@/lib/warden'

export type ParentAlertTone = 'info' | 'success' | 'warning' | 'danger'

export interface ParentAlert {
  id: string
  tone: ParentAlertTone
  title: string
  message: string
  at: string
}

export type WardCampusStatus = 'in_hostel' | 'outside' | 'overdue' | 'no_active_pass'

export interface WardStatusSummary {
  campusStatus: WardCampusStatus
  label: string
  detail: string
  activePass: OutpassRequest | null
}

export function getWardStatusSummary(
  passes: OutpassRequest[],
  gateLogs: GateLog[],
): WardStatusSummary {
  const activePasses = passes.filter(
    (p) => p.status === 'approved' || p.status === 'extended',
  )

  const currentlyOutPass = activePasses.find((pass) =>
    isStudentCurrentlyOut(pass, gateLogs),
  )

  if (currentlyOutPass) {
    const overdue = isPassOverdue(currentlyOutPass, gateLogs)
    const exitTime = getExitTime(currentlyOutPass.id, gateLogs)

    if (overdue) {
      const overdueMs = Math.max(
        0,
        Date.now() - new Date(currentlyOutPass.return_by).getTime(),
      )
      return {
        campusStatus: 'overdue',
        label: 'Overdue — still outside campus',
        detail: `Was due back ${formatReturnTime(currentlyOutPass.return_by)} (${formatOverdueDuration(overdueMs)} late)`,
        activePass: currentlyOutPass,
      }
    }

    return {
      campusStatus: 'outside',
      label: 'Currently outside campus',
      detail: exitTime
        ? `Left at ${formatReturnTime(exitTime)} · Return by ${formatReturnTime(currentlyOutPass.return_by)}`
        : `Return by ${formatReturnTime(currentlyOutPass.return_by)}`,
      activePass: currentlyOutPass,
    }
  }

  const upcomingActive = activePasses.find((pass) => !hasEntryLog(pass.id, gateLogs))

  if (upcomingActive) {
    return {
      campusStatus: 'in_hostel',
      label: 'In hostel — approved pass active',
      detail: `${PASS_TYPE_LABELS[upcomingActive.pass_type]} to ${upcomingActive.destination} · Return by ${formatReturnTime(upcomingActive.return_by)}`,
      activePass: upcomingActive,
    }
  }

  return {
    campusStatus: 'no_active_pass',
    label: 'In hostel — no active pass',
    detail: 'No approved outpass is currently in use.',
    activePass: null,
  }
}

export function buildParentAlerts(
  passes: OutpassRequest[],
  gateLogs: GateLog[],
  extensions: ExtensionRequest[],
  wardName: string,
): ParentAlert[] {
  const alerts: ParentAlert[] = []
  const passById = new Map(passes.map((p) => [p.id, p]))

  for (const log of [...gateLogs].sort(
    (a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime(),
  )) {
    const pass = passById.get(log.outpass_id)
    if (!pass) continue

    if (log.event_type === 'exit') {
      alerts.push({
        id: `exit-${log.id}`,
        tone: 'info',
        title: 'Left campus',
        message: `${wardName} exited for ${pass.destination} (${PASS_TYPE_LABELS[pass.pass_type]})`,
        at: log.scanned_at,
      })
    } else {
      alerts.push({
        id: `entry-${log.id}`,
        tone: 'success',
        title: 'Returned to campus',
        message: `${wardName} entered back from ${pass.destination}`,
        at: log.scanned_at,
      })
    }
  }

  for (const pass of passes) {
    if (pass.status === 'pending') {
      alerts.push({
        id: `pending-${pass.id}`,
        tone: 'warning',
        title: 'Pass awaiting approval',
        message: `${PASS_TYPE_LABELS[pass.pass_type]} to ${pass.destination} · Departs ${formatTableDateTime(pass.departure_at)}`,
        at: pass.created_at,
      })
    }

    if (pass.status === 'approved' && pass.approved_at) {
      alerts.push({
        id: `approved-${pass.id}`,
        tone: 'success',
        title: 'Pass approved',
        message: `${PASS_TYPE_LABELS[pass.pass_type]} to ${pass.destination} approved by warden`,
        at: pass.approved_at,
      })
    }

    if (pass.status === 'rejected') {
      alerts.push({
        id: `rejected-${pass.id}`,
        tone: 'danger',
        title: 'Pass rejected',
        message: `${PASS_TYPE_LABELS[pass.pass_type]} to ${pass.destination} was not approved`,
        at: pass.created_at,
      })
    }

    if (isPassOverdue(pass, gateLogs)) {
      alerts.push({
        id: `overdue-${pass.id}`,
        tone: 'danger',
        title: 'Overdue return',
        message: `${wardName} has not returned by ${formatReturnTime(pass.return_by)}`,
        at: pass.return_by,
      })
    }
  }

  for (const ext of extensions) {
    const pass = passById.get(ext.outpass_id)
    if (!pass) continue

    if (ext.status === 'pending') {
      alerts.push({
        id: `ext-pending-${ext.id}`,
        tone: 'warning',
        title: 'Extension requested',
        message: `New return time requested: ${formatReturnTime(ext.new_return_time)}`,
        at: ext.created_at,
      })
    }

    if (ext.status === 'approved') {
      alerts.push({
        id: `ext-approved-${ext.id}`,
        tone: 'success',
        title: 'Extension approved',
        message: `Return extended to ${formatReturnTime(ext.new_return_time)}`,
        at: ext.created_at,
      })
    }

    if (ext.status === 'rejected') {
      alerts.push({
        id: `ext-rejected-${ext.id}`,
        tone: 'danger',
        title: 'Extension rejected',
        message: `Extension for ${pass.destination} was not approved`,
        at: ext.created_at,
      })
    }
  }

  return alerts
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 30)
}

export function getPassGateSummary(
  passId: string,
  gateLogs: GateLog[],
): { exitAt: string | null; entryAt: string | null } {
  return {
    exitAt: getExitTime(passId, gateLogs),
    entryAt: getEntryTime(passId, gateLogs),
  }
}
