import type { GateLog, OutpassRequest, StudentProfile } from '@/lib/types'
import { hasEntryLog } from '@/lib/pass-filters'

export function getStudentName(student: StudentProfile | null | undefined): string {
  return student?.profiles?.full_name ?? 'Unknown'
}

export function getStudentReg(student: StudentProfile | null | undefined): string {
  return student?.reg_number ?? '—'
}

export function getStudentRoom(student: StudentProfile | null | undefined): string {
  if (!student) return '—'
  const block = student.hostel_block ? ` · ${student.hostel_block}` : ''
  return `${student.room_number}${block}`
}

export function isStudentCurrentlyOut(
  pass: OutpassRequest,
  gateLogs: GateLog[],
): boolean {
  if (pass.status !== 'approved' && pass.status !== 'extended') return false

  const passLogs = gateLogs
    .filter((log) => log.outpass_id === pass.id)
    .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())

  return passLogs.length > 0 && passLogs[0].event_type === 'exit' && !hasEntryLog(pass.id, gateLogs)
}

export function isOverdueReturn(pass: OutpassRequest, gateLogs: GateLog[]): boolean {
  if (pass.status !== 'approved' && pass.status !== 'extended') return false
  if (hasEntryLog(pass.id, gateLogs)) return false
  return Date.now() > new Date(pass.return_by).getTime()
}

export function getExitTime(passId: string, gateLogs: GateLog[]): string | null {
  const exitLog = gateLogs
    .filter((log) => log.outpass_id === passId && log.event_type === 'exit')
    .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())[0]

  return exitLog?.scanned_at ?? null
}

export function getEntryTime(passId: string, gateLogs: GateLog[]): string | null {
  const entryLog = gateLogs
    .filter((log) => log.outpass_id === passId && log.event_type === 'entry')
    .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())[0]

  return entryLog?.scanned_at ?? null
}

export function isApprovedToday(approvedAt: string | null): boolean {
  if (!approvedAt) return false
  const approved = new Date(approvedAt)
  const now = new Date()
  return (
    approved.getFullYear() === now.getFullYear()
    && approved.getMonth() === now.getMonth()
    && approved.getDate() === now.getDate()
  )
}
