/** @deprecated Import from `@/utils/report-export` instead. */
export { formatDate, formatDateTime, formatDuration, formatTime } from '@/utils/report-export'

export { exportReport } from '@/utils/report-export'

export async function exportReportToExcel(
  options: import('@/utils/report-export/types').ReportExportOptions,
): Promise<string> {
  const mod = await import('@/utils/report-export/export-excel')
  return mod.exportReportToExcel(options)
}

export async function exportReportToPdf(
  options: import('@/utils/report-export/types').ReportExportOptions,
): Promise<string> {
  const mod = await import('@/utils/report-export/export-pdf')
  return mod.exportReportToPdf(options)
}
