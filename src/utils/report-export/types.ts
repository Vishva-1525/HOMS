import type { ReportRow, ReportStats } from '@/lib/report-types'

export interface ReportExportFilters {
  reportType: string
  dateLabel: string
  hostelBlock?: string | null
  department?: string | null
}

export interface ReportExportOptions {
  rows: ReportRow[]
  filters: ReportExportFilters
  stats?: ReportStats
  generatedAt?: Date
}

export type ReportExportFormat = 'xlsx' | 'pdf'
