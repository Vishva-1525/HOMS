import type { ReportRow } from '@/lib/report-types'
import { formatBlockLabel } from '@/lib/block-display'
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatOverdueLabel,
  formatPassTypeLabel,
  formatReportStatus,
  formatTime,
} from '@/utils/report-export/formatters'

/** Full column set for Excel/PDF hosteller tracking exports. */
export const REPORT_EXPORT_HEADERS = [
  'S.No',
  'Pass ID',
  'Student Name',
  'Register Number',
  'Room No',
  'Block',
  'Department',
  'Year',
  'Pass Type',
  'Destination',
  'Reason',
  'Request Submitted',
  'Departure Date',
  'Departure Time',
  'Return By',
  'Actual Exit',
  'Actual Entry',
  'Hours Outside',
  'Request Status',
  'Gate Status',
  'Overdue',
  'Approved By',
  'Warden Remark',
] as const

function formatRequestStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
}

export function reportRowToExportRow(row: ReportRow, index: number): (string | number)[] {
  return [
    index + 1,
    row.outpass_id ?? '—',
    row.student_name,
    row.reg_number,
    row.room_number,
    formatBlockLabel(row.hostel_block),
    row.department,
    row.year_of_study,
    formatPassTypeLabel(row.pass_type),
    row.destination,
    row.reason,
    formatDateTime(row.submitted_at),
    formatDate(row.departure_at),
    formatTime(row.departure_at),
    formatDateTime(row.return_by),
    row.actual_exit_time ? formatDateTime(row.actual_exit_time) : '—',
    row.actual_entry_time ? formatDateTime(row.actual_entry_time) : '—',
    row.hours_outside != null ? formatDuration(row.hours_outside) : '—',
    formatRequestStatus(row.status),
    formatReportStatus(row),
    formatOverdueLabel(row.is_overdue),
    row.approved_by_name ?? '—',
    row.warden_remark ?? '—',
  ]
}

export function buildExportTableBody(rows: ReportRow[]): (string | number)[][] {
  return rows.map((row, index) => reportRowToExportRow(row, index))
}
