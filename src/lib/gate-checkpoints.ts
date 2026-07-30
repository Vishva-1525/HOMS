import type { GateLog } from '@/lib/types'

/** Four sequential QR scan checkpoints (hostel ↔ main gate). */
export type GateCheckpoint =
  | 'hostel_exit'
  | 'main_exit'
  | 'main_entry'
  | 'hostel_entry'

export const GATE_CHECKPOINTS: readonly GateCheckpoint[] = [
  'hostel_exit',
  'main_exit',
  'main_entry',
  'hostel_entry',
] as const

export const GATE_CHECKPOINT_LABELS: Record<GateCheckpoint, string> = {
  hostel_exit: 'Hostel Gate Exit',
  main_exit: 'Main Gate Exit',
  main_entry: 'Main Gate Entry',
  hostel_entry: 'Hostel Gate Entry',
}

export const GATE_CHECKPOINT_SHORT_LABELS: Record<GateCheckpoint, string> = {
  hostel_exit: 'Hostel Exit',
  main_exit: 'Main Exit',
  main_entry: 'Main Entry',
  hostel_entry: 'Hostel Entry',
}

/** Maps checkpoint → legacy exit/entry for reports and older queries. */
export function checkpointToEventType(checkpoint: GateCheckpoint): 'exit' | 'entry' {
  return checkpoint === 'hostel_exit' || checkpoint === 'main_exit' ? 'exit' : 'entry'
}

export function checkpointIndex(checkpoint: GateCheckpoint): number {
  return GATE_CHECKPOINTS.indexOf(checkpoint)
}

export function getCheckpointFromLog(
  log: Pick<GateLog, 'checkpoint' | 'event_type'>,
): GateCheckpoint | null {
  if (log.checkpoint) return log.checkpoint
  // Legacy 2-scan rows: treat exit as hostel exit and entry as hostel entry.
  if (log.event_type === 'exit') return 'hostel_exit'
  if (log.event_type === 'entry') return 'hostel_entry'
  return null
}

function istDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export function getTodayIstDateKey(now = new Date()): string {
  return istDateKey(now)
}

/** Logs for one pass, oldest → newest. */
export function getOrderedPassLogs(passId: string, gateLogs: GateLog[]): GateLog[] {
  return gateLogs
    .filter((log) => log.outpass_id === passId)
    .sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime())
}

export function getLatestPassLog(passId: string, gateLogs: GateLog[]): GateLog | null {
  const ordered = getOrderedPassLogs(passId, gateLogs)
  return ordered[ordered.length - 1] ?? null
}

/** Completed checkpoints for the active cycle (single-use: whole pass; multi: today IST). */
export function getCompletedCheckpoints(
  passId: string,
  gateLogs: GateLog[],
  options?: { multiDaily?: boolean; dayKey?: string },
): GateCheckpoint[] {
  const dayKey = options?.dayKey ?? getTodayIstDateKey()
  const logs = getOrderedPassLogs(passId, gateLogs).filter((log) => {
    if (!options?.multiDaily) return true
    return istDateKey(log.scanned_at) === dayKey
  })

  const completed: GateCheckpoint[] = []
  for (const log of logs) {
    const cp = getCheckpointFromLog(log)
    if (cp && !completed.includes(cp)) completed.push(cp)
  }
  return completed.sort((a, b) => checkpointIndex(a) - checkpointIndex(b))
}

export function hasCheckpoint(
  passId: string,
  gateLogs: GateLog[],
  checkpoint: GateCheckpoint,
  options?: { multiDaily?: boolean; dayKey?: string },
): boolean {
  return getCompletedCheckpoints(passId, gateLogs, options).includes(checkpoint)
}

/** Next required checkpoint, or null when the cycle is complete. */
export function getNextCheckpoint(
  passId: string,
  gateLogs: GateLog[],
  options?: { multiDaily?: boolean; dayKey?: string },
): GateCheckpoint | null {
  const completed = getCompletedCheckpoints(passId, gateLogs, options)
  for (const cp of GATE_CHECKPOINTS) {
    if (!completed.includes(cp)) return cp
  }
  return null
}

export function isCheckpointCycleComplete(
  passId: string,
  gateLogs: GateLog[],
  options?: { multiDaily?: boolean; dayKey?: string },
): boolean {
  return getNextCheckpoint(passId, gateLogs, options) === null
}

/** Left hostel / mid-trip: hostel exit done, hostel entry not yet. */
export function isTripInProgress(
  passId: string,
  gateLogs: GateLog[],
  options?: { multiDaily?: boolean; dayKey?: string },
): boolean {
  const completed = getCompletedCheckpoints(passId, gateLogs, options)
  return completed.includes('hostel_exit') && !completed.includes('hostel_entry')
}

/** Outside campus: main exit done, main entry not yet. */
export function isOutsideCampus(
  passId: string,
  gateLogs: GateLog[],
  options?: { multiDaily?: boolean; dayKey?: string },
): boolean {
  const completed = getCompletedCheckpoints(passId, gateLogs, options)
  return completed.includes('main_exit') && !completed.includes('main_entry')
}

export type CheckpointProgressItem = {
  checkpoint: GateCheckpoint
  label: string
  status: 'done' | 'current' | 'pending'
}

export function buildCheckpointProgress(
  passId: string,
  gateLogs: GateLog[],
  options?: { multiDaily?: boolean; dayKey?: string },
): CheckpointProgressItem[] {
  const completed = getCompletedCheckpoints(passId, gateLogs, options)
  const next = getNextCheckpoint(passId, gateLogs, options)

  return GATE_CHECKPOINTS.map((checkpoint) => {
    let status: CheckpointProgressItem['status'] = 'pending'
    if (completed.includes(checkpoint)) status = 'done'
    else if (next === checkpoint) status = 'current'
    return {
      checkpoint,
      label: GATE_CHECKPOINT_LABELS[checkpoint],
      status,
    }
  })
}
