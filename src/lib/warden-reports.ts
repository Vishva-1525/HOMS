import { PASS_TYPE_LABELS, STATUS_LABELS, formatReturnTime } from '@/lib/outpass'
import { isWithinRange, type DateRange } from '@/lib/report-dates'
import {
  getEntryTime,
  getStudentName,
  getStudentReg,
  getStudentRoom,
  isOverdueReturn,
  isStudentCurrentlyOut,
} from '@/lib/warden'
import type { GateLog, OutpassWithStudent } from '@/lib/types'

export interface ReportStats {
  total: number
  approved: number
  rejected: number
  overdue: number
  currentlyOut: number
}

export interface ReportTableRow {
  studentName: string
  regNumber: string
  room: string
  passType: string
  destination: string
  departure: string
  returnBy: string
  actualEntry: string
  status: string
  wardenRemark: string
}

export const REPORT_TABLE_HEADERS = [
  'Student Name',
  'Reg Number',
  'Room',
  'Pass Type',
  'Destination',
  'Departure',
  'Return By',
  'Actual Entry Time',
  'Status',
  'Warden Remark',
] as const

export function filterPassesByRange(
  passes: OutpassWithStudent[],
  range: DateRange,
): OutpassWithStudent[] {
  return passes.filter((pass) => isWithinRange(pass.created_at, range))
}

export function computeReportStats(
  passes: OutpassWithStudent[],
  gateLogs: GateLog[],
): ReportStats {
  return {
    total: passes.length,
    approved: passes.filter((p) => p.status === 'approved' || p.status === 'extended').length,
    rejected: passes.filter((p) => p.status === 'rejected').length,
    overdue: passes.filter((p) => isOverdueReturn(p, gateLogs)).length,
    currentlyOut: passes.filter((p) => isStudentCurrentlyOut(p, gateLogs)).length,
  }
}

export function buildReportTableRow(
  pass: OutpassWithStudent,
  gateLogs: GateLog[],
): ReportTableRow {
  const entryTime = getEntryTime(pass.id, gateLogs)

  return {
    studentName: getStudentName(pass.students),
    regNumber: getStudentReg(pass.students),
    room: getStudentRoom(pass.students),
    passType: PASS_TYPE_LABELS[pass.pass_type],
    destination: pass.destination,
    departure: formatReturnTime(pass.departure_at),
    returnBy: formatReturnTime(pass.return_by),
    actualEntry: entryTime ? formatReturnTime(entryTime) : '—',
    status: STATUS_LABELS[pass.status],
    wardenRemark: pass.warden_remark ?? '—',
  }
}

export function reportRowToArray(row: ReportTableRow): string[] {
  return [
    row.studentName,
    row.regNumber,
    row.room,
    row.passType,
    row.destination,
    row.departure,
    row.returnBy,
    row.actualEntry,
    row.status,
    row.wardenRemark,
  ]
}
