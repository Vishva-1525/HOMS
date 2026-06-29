import * as XLSX from 'xlsx'
import {
  buildExportFilename,
  buildFilterSummaryLines,
  buildReportHeaderLines,
  buildSummaryRows,
} from '@/utils/report-export/build-meta'
import {
  REPORT_EXPORT_HEADERS,
  buildExportTableBody,
} from '@/utils/report-export/report-columns'
import type { ReportExportOptions } from '@/utils/report-export/types'

const COLUMN_WIDTHS = [
  { wch: 5 },
  { wch: 38 },
  { wch: 22 },
  { wch: 16 },
  { wch: 8 },
  { wch: 10 },
  { wch: 14 },
  { wch: 6 },
  { wch: 12 },
  { wch: 22 },
  { wch: 30 },
  { wch: 22 },
  { wch: 14 },
  { wch: 12 },
  { wch: 22 },
  { wch: 22 },
  { wch: 22 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 8 },
  { wch: 18 },
  { wch: 32 },
]

export function exportReportToExcel(options: ReportExportOptions): string {
  const { rows, filters } = options
  const headerRows = buildReportHeaderLines(options)
  const dataRows = buildExportTableBody(rows)
  const summaryRows = buildSummaryRows(rows)
  const filterLines = buildFilterSummaryLines(filters)

  const allRows = [...headerRows, [...REPORT_EXPORT_HEADERS], ...dataRows, ...summaryRows]
  const ws = XLSX.utils.aoa_to_sheet(allRows)
  ws['!cols'] = COLUMN_WIDTHS

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `${filters.reportType} Report`)

  const summaryWs = XLSX.utils.aoa_to_sheet([
    ['SVCE Hostel — Report Summary'],
    ...filterLines.map((line) => [line]),
    [],
    ['Metric', 'Count'],
    ['Total records exported', rows.length],
    ['Pending', rows.filter((r) => r.status === 'pending').length],
    ['Approved', rows.filter((r) => r.status === 'approved' || r.status === 'extended').length],
    ['Rejected', rows.filter((r) => r.status === 'rejected').length],
    ['Cancelled', rows.filter((r) => r.status === 'cancelled').length],
    ['Overdue', rows.filter((r) => r.is_overdue).length],
    ['Students who exited (gate)', rows.filter((r) => r.actual_exit_time).length],
    ['Students who returned (gate)', rows.filter((r) => r.actual_entry_time).length],
    [
      'Currently outside (exited, not returned)',
      rows.filter((r) => r.actual_exit_time && !r.actual_entry_time).length,
    ],
    [
      'Completed round trip',
      rows.filter((r) => r.actual_exit_time && r.actual_entry_time).length,
    ],
  ])
  summaryWs['!cols'] = [{ wch: 42 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  const filename = buildExportFilename(filters, 'xlsx')
  XLSX.writeFile(wb, filename)
  return filename
}
