export type {
  ReportExportFilters,
  ReportExportFormat,
  ReportExportOptions,
} from '@/utils/report-export/types'

export {
  formatDate,
  formatDateTime,
  formatDuration,
  formatGeneratedTimestamp,
  formatOverdueLabel,
  formatPassTypeLabel,
  formatReportStatus,
  formatTime,
} from '@/utils/report-export/formatters'

export { REPORT_EXPORT_HEADERS, reportRowToExportRow } from '@/utils/report-export/report-columns'

/** Prefer dynamic import of export-excel / export-pdf at call sites to keep xlsx/jspdf out of the main graph. */
export async function exportReport(
  format: import('@/utils/report-export/types').ReportExportFormat,
  options: import('@/utils/report-export/types').ReportExportOptions,
): Promise<string> {
  if (format === 'pdf') {
    const { exportReportToPdf } = await import('@/utils/report-export/export-pdf')
    return exportReportToPdf(options)
  }
  const { exportReportToExcel } = await import('@/utils/report-export/export-excel')
  return exportReportToExcel(options)
}
