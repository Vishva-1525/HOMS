import type { ReportExportFilters, ReportExportOptions } from '@/utils/report-export/types'
import { formatGeneratedTimestamp } from '@/utils/report-export/formatters'

const COLLEGE_NAME = 'Sri Venkateswara College of Engineering'

export function buildReportTitle(filters: ReportExportFilters): string {
  return `Hostel Outpass Report — ${filters.reportType} — ${filters.dateLabel}`
}

export function buildExportFilename(
  filters: ReportExportFilters,
  extension: 'xlsx' | 'pdf',
): string {
  const safeLabel = filters.dateLabel.replace(/[^\w-]+/g, '_').replace(/_+/g, '_')
  return `SVCE_Outpass_${filters.reportType}_${safeLabel}.${extension}`
}

export function buildFilterSummaryLines(filters: ReportExportFilters): string[] {
  const lines = [
    `Report type: ${filters.reportType}`,
    `Period: ${filters.dateLabel}`,
  ]

  if (filters.hostelBlock) {
    lines.push(`Block filter: Block ${filters.hostelBlock}`)
  }

  if (filters.department) {
    lines.push(`Department filter: ${filters.department}`)
  }

  if (!filters.hostelBlock && !filters.department) {
    lines.push('Filters: All blocks, all departments')
  }

  return lines
}

export function buildReportHeaderLines(options: ReportExportOptions): string[][] {
  const generatedAt = options.generatedAt ?? new Date()
  const { filters } = options

  return [
    [COLLEGE_NAME],
    [buildReportTitle(filters)],
    [`Generated on: ${formatGeneratedTimestamp(generatedAt)}`],
    ...buildFilterSummaryLines(filters).map((line) => [line]),
    [],
  ]
}

export function buildSummaryRows(rows: ReportExportOptions['rows']): (string | number)[][] {
  return [
    [],
    ['--- Summary ---'],
    ['Total Records', rows.length],
    ['Pending', rows.filter((r) => r.status === 'pending').length],
    ['Approved', rows.filter((r) => r.status === 'approved' || r.status === 'extended').length],
    ['Rejected', rows.filter((r) => r.status === 'rejected').length],
    ['Cancelled', rows.filter((r) => r.status === 'cancelled').length],
    ['Overdue', rows.filter((r) => r.is_overdue).length],
    ['Exited (gate scan)', rows.filter((r) => r.actual_exit_time).length],
    ['Returned (gate scan)', rows.filter((r) => r.actual_entry_time).length],
    ['Currently outside', rows.filter((r) => r.actual_exit_time && !r.actual_entry_time).length],
    ['Completed (exit + entry)', rows.filter((r) => r.actual_exit_time && r.actual_entry_time).length],
  ]
}
