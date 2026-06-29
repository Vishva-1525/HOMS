import type { ReportRow } from '@/lib/report-types'
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatOverdueLabel,
  formatPassTypeLabel,
  formatReportStatus,
  formatTime,
} from '@/utils/report-export/formatters'

/** Column headers aligned with ReportsPanel DataTable. */
export const REPORT_EXPORT_HEADERS = [
  'S.No',
  'Student Name',
  'Register Number',
  'Room No',
  'Block',
  'Department',
  'Year',
  'Pass Type',
  'Destination',
  'Reason',
  'Departure Date',
  'Departure Time',
  'Return By',
  'Actual Exit Time',
  'Actual Entry Time',
  'Hours Outside',
  'Status',
  'Overdue',
  'Approved By',
  'Warden Remark',
] as const

export function reportRowToExportRow(row: ReportRow, index: number): (string | number)[] {
  return [
    index + 1,
    row.student_name,
    row.reg_number,
    row.room_number,
    row.hostel_block,
    row.department,
    row.year_of_study,
    formatPassTypeLabel(row.pass_type),
    row.destination,
    row.reason,
    formatDate(row.departure_at),
    formatTime(row.departure_at),
    formatDateTime(row.return_by),
    row.actual_exit_time ? formatTime(row.actual_exit_time) : '—',
    row.actual_entry_time ? formatTime(row.actual_entry_time) : '—',
    row.hours_outside != null ? formatDuration(row.hours_outside) : '—',
    formatReportStatus(row),
    formatOverdueLabel(row.is_overdue),
    row.approved_by_name ?? '—',
    row.warden_remark ?? '—',
  ]
}

export function buildExportTableBody(rows: ReportRow[]): (string | number)[][] {
  return rows.map((row, index) => reportRowToExportRow(row, index))
}
