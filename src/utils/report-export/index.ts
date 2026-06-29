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

export { exportReportToExcel } from '@/utils/report-export/export-excel'
export { exportReportToPdf } from '@/utils/report-export/export-pdf'

import type { ReportExportFormat, ReportExportOptions } from '@/utils/report-export/types'
import { exportReportToExcel } from '@/utils/report-export/export-excel'
import { exportReportToPdf } from '@/utils/report-export/export-pdf'

export function exportReport(format: ReportExportFormat, options: ReportExportOptions): string {
  if (format === 'pdf') return exportReportToPdf(options)
  return exportReportToExcel(options)
}
