import { getCheckpointFromLog } from '@/lib/gate-checkpoints'
import type { EnrichedGateLog, PassScanHistoryRow } from '@/hooks/security/useSecurityGateLog'
import {
  getAdmissionNo,
  getAllGateLogs,
  getAllPasses,
  getScannerNames,
} from '@/lib/offline/security-db'
import { formatStudentRoomDisplay, getStudentName } from '@/lib/warden'
import type { GateLog, OutpassWithStudent, PassType } from '@/lib/types'

function derivePassStatus(
  exitAt: string | null,
  entryAt: string | null,
): PassScanHistoryRow['status'] {
  if (exitAt && entryAt) return 'returned'
  if (exitAt && !entryAt) return 'outside'
  return 'incomplete'
}

function buildPassScanHistory(logs: EnrichedGateLog[]): PassScanHistoryRow[] {
  const byPass = new Map<string, PassScanHistoryRow>()

  for (const log of logs) {
    const existing = byPass.get(log.outpass_id) ?? {
      outpass_id: log.outpass_id,
      studentName: log.studentName,
      admissionNo: log.admissionNo,
      room: log.room,
      destination: log.destination,
      passType: log.passType,
      exitAt: null,
      entryAt: null,
      exitScanner: null,
      entryScanner: null,
      status: 'incomplete' as const,
      lastActivityAt: log.scanned_at,
    }

    const checkpoint = log.checkpoint
    if (checkpoint === 'hostel_exit' || (!checkpoint && log.event_type === 'exit')) {
      if (!existing.exitAt || log.scanned_at < existing.exitAt) {
        existing.exitAt = log.scanned_at
        existing.exitScanner = log.scannerName
      }
    }
    if (checkpoint === 'hostel_entry' || (!checkpoint && log.event_type === 'entry')) {
      if (!existing.entryAt || log.scanned_at > existing.entryAt) {
        existing.entryAt = log.scanned_at
        existing.entryScanner = log.scannerName
      }
    }

    if (log.scanned_at > existing.lastActivityAt) {
      existing.lastActivityAt = log.scanned_at
    }

    existing.status = derivePassStatus(existing.exitAt, existing.entryAt)
    byPass.set(log.outpass_id, existing)
  }

  return [...byPass.values()].sort(
    (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime(),
  )
}

export async function loadCachedSecurityGateLog(): Promise<{
  logs: EnrichedGateLog[]
  passHistory: PassScanHistoryRow[]
  activePasses: OutpassWithStudent[]
  recentRawLogs: GateLog[]
}> {
  const [passes, rawLogs] = await Promise.all([getAllPasses(), getAllGateLogs()])
  const passById = new Map(passes.map((pass) => [pass.id, pass]))
  const scannerMap = await getScannerNames(
    [...new Set(rawLogs.map((log) => log.scanned_by).filter(Boolean))],
  )

  const logs: EnrichedGateLog[] = []
  for (const log of rawLogs) {
    const pass = passById.get(log.outpass_id)
    const student = pass?.students ?? null
    const admissionNo = pass ? (await getAdmissionNo(pass.student_id)) ?? '-' : '-'

    logs.push({
      id: log.id,
      outpass_id: log.outpass_id,
      scanned_by: log.scanned_by,
      event_type: log.event_type,
      checkpoint: getCheckpointFromLog(log),
      scanned_at: log.scanned_at,
      studentName: getStudentName(student),
      admissionNo,
      room: formatStudentRoomDisplay(student),
      passType: (pass?.pass_type as PassType | undefined) ?? null,
      destination: pass?.destination ?? '-',
      scannerName: scannerMap[log.scanned_by] ?? 'Offline guard',
    })
  }

  return {
    logs,
    passHistory: buildPassScanHistory(logs),
    activePasses: passes,
    recentRawLogs: rawLogs,
  }
}
