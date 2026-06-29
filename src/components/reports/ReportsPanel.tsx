import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge, type StatusBadgeStatus } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  fetchDistinctBlocks,
  fetchDistinctDepartments,
  useReportData,
} from '@/hooks/useReportData'
import type { ReportFilters, ReportRow } from '@/lib/report-types'
import {
  formatDailyTabLabel,
  formatMonthlyTabLabel,
  formatRangeLabel,
  formatWeeklyTabLabel,
  getCustomRange,
  getRangeForPeriod,
  reportTypeLabel,
  type ReportPeriod,
} from '@/lib/report-dates'
import type { PassType } from '@/lib/types'
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
} from '@/utils/report-export'
import type { ReportExportFormat } from '@/utils/report-export'
import { cn } from '@/lib/utils'

type ReportTab = ReportPeriod | 'custom' | 'aggregate'

const PERIOD_TABS: { id: ReportTab; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'custom', label: 'Custom range' },
]

const AGGREGATE_TAB: { id: ReportTab; label: string } = { id: 'aggregate', label: 'Aggregate' }

const PASS_TYPES: PassType[] = ['outpass', 'staypass', 'night_pass']

function reportRowStatus(row: ReportRow): StatusBadgeStatus {
  if (row.is_overdue) return 'overdue'
  if (row.actual_entry_time) return 'completed'
  switch (row.status) {
    case 'pending':
      return 'pending'
    case 'approved':
    case 'extended':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'pending'
  }
}

function reportStatusLabel(row: ReportRow): string | undefined {
  if (row.is_overdue) return 'Overdue'
  if (row.actual_entry_time) return 'Completed'
  if (row.status === 'extended') return 'Extended'
  return undefined
}

const REPORT_COLUMNS: DataTableColumn<ReportRow>[] = [
  {
    header: 'S.No',
    accessor: 'reg_number',
    width: '56px',
    render: (_row, index) => index + 1,
  },
  {
    header: 'Student Name',
    accessor: 'student_name',
    width: '160px',
  },
  {
    header: 'Register Number',
    accessor: 'reg_number',
    width: '130px',
    cellClassName: 'font-mono text-xs',
  },
  { header: 'Room No', accessor: 'room_number', width: '80px' },
  { header: 'Block', accessor: 'hostel_block', width: '72px' },
  { header: 'Department', accessor: 'department', width: '110px' },
  {
    header: 'Year',
    accessor: 'year_of_study',
    width: '64px',
    render: (row) => row.year_of_study,
  },
  {
    header: 'Pass Type',
    accessor: 'pass_type',
    width: '110px',
    render: (row) => <PassTypeBadge type={row.pass_type as PassType} />,
  },
  { header: 'Destination', accessor: 'destination', width: '140px' },
  { header: 'Reason', accessor: 'reason', width: '180px' },
  {
    header: 'Departure Date',
    accessor: 'departure_at',
    width: '120px',
    render: (row) => formatDate(row.departure_at),
  },
  {
    header: 'Departure Time',
    accessor: 'departure_at',
    width: '110px',
    render: (row) => formatTime(row.departure_at),
  },
  {
    header: 'Return By',
    accessor: 'return_by',
    width: '170px',
    render: (row) => formatDateTime(row.return_by),
  },
  {
    header: 'Actual Exit Time',
    accessor: 'actual_exit_time',
    width: '120px',
    render: (row) => (row.actual_exit_time ? formatTime(row.actual_exit_time) : '—'),
  },
  {
    header: 'Actual Entry Time',
    accessor: 'actual_entry_time',
    width: '120px',
    render: (row) => (row.actual_entry_time ? formatTime(row.actual_entry_time) : '—'),
  },
  {
    header: 'Hours Outside',
    accessor: 'hours_outside',
    width: '110px',
    render: (row) =>
      row.hours_outside != null ? formatDuration(row.hours_outside) : '—',
  },
  {
    header: 'Status',
    accessor: 'status',
    width: '110px',
    render: (row) => (
      <StatusBadge status={reportRowStatus(row)} label={reportStatusLabel(row)} />
    ),
  },
  {
    header: 'Overdue',
    accessor: 'is_overdue',
    width: '72px',
    render: (row) => (
      <span className={cn(row.is_overdue && 'font-medium text-[#DC2626]')}>
        {row.is_overdue ? 'Yes' : 'No'}
      </span>
    ),
  },
  {
    header: 'Approved By',
    accessor: 'approved_by_name',
    width: '130px',
    render: (row) => row.approved_by_name ?? '—',
  },
  {
    header: 'Warden Remark',
    accessor: 'warden_remark',
    width: '180px',
    render: (row) => row.warden_remark ?? '—',
  },
]

export interface ReportsPanelProps {
  title: string
  /** Warden: fixed block filter. Admin: omit to use dropdown. */
  fixedHostelBlock?: string | null
  showBlockFilter?: boolean
  showDepartmentFilter?: boolean
  showAggregateTab?: boolean
}

function ReportAggregateTable({ rows }: { rows: ReportRow[] }) {
  const blocks = useMemo(() => {
    const set = new Set(rows.map((r) => r.hostel_block).filter(Boolean))
    return [...set].sort()
  }, [rows])

  const matrix = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of rows) {
      const key = `${row.hostel_block}::${row.pass_type}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [rows])

  if (blocks.length === 0) {
    return (
      <div className="dashboard-surface px-4 py-12 text-center text-sm text-slate-600">
        No data for aggregate summary in this period.
      </div>
    )
  }

  return (
    <div className="dashboard-surface overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/50 bg-white/45">
            <th className="px-4 py-3 text-[length:var(--svce-text-small)] font-semibold uppercase tracking-wide text-slate-700">
              Block
            </th>
            {PASS_TYPES.map((type) => (
              <th
                key={type}
                className="px-4 py-3 text-center text-[length:var(--svce-text-small)] font-semibold uppercase tracking-wide text-slate-700"
              >
                <PassTypeBadge type={type} />
              </th>
            ))}
            <th className="px-4 py-3 text-center text-[length:var(--svce-text-small)] font-semibold uppercase tracking-wide text-slate-700">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((block) => {
            const typeCounts = PASS_TYPES.map(
              (type) => matrix.get(`${block}::${type}`) ?? 0,
            )
            const rowTotal = typeCounts.reduce((sum, n) => sum + n, 0)
            return (
              <tr
                key={block}
                className="h-[var(--table-row-height)] border-b border-white/40 bg-transparent"
              >
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{block}</td>
                {typeCounts.map((count, i) => (
                  <td key={PASS_TYPES[i]} className="px-4 py-3 text-center text-sm tabular-nums text-slate-800">
                    {count}
                  </td>
                ))}
                <td className="px-4 py-3 text-center text-sm font-semibold tabular-nums text-slate-900">
                  {rowTotal}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function ReportsPanel({
  title,
  fixedHostelBlock,
  showBlockFilter = false,
  showDepartmentFilter = false,
  showAggregateTab = false,
}: ReportsPanelProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily')
  const [periodTab, setPeriodTab] = useState<ReportPeriod | 'custom'>('daily')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [appliedCustomRange, setAppliedCustomRange] = useState<ReturnType<typeof getCustomRange>>(null)
  const [blockFilter, setBlockFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [blockOptions, setBlockOptions] = useState<string[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([])
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null)
  const [exportToast, setExportToast] = useState<string | null>(null)

  useEffect(() => {
    if (!showBlockFilter && !showDepartmentFilter) return
    void (async () => {
      const [blocks, departments] = await Promise.all([
        showBlockFilter ? fetchDistinctBlocks() : Promise.resolve([]),
        showDepartmentFilter ? fetchDistinctDepartments() : Promise.resolve([]),
      ])
      setBlockOptions(blocks)
      setDepartmentOptions(departments)
    })()
  }, [showBlockFilter, showDepartmentFilter])

  const activeRange = useMemo(() => {
    if (periodTab === 'custom') {
      return appliedCustomRange ?? getRangeForPeriod('daily')
    }
    return getRangeForPeriod(periodTab)
  }, [periodTab, appliedCustomRange])

  const dateSubtitle = useMemo(() => {
    if (periodTab === 'daily') return formatDailyTabLabel()
    if (periodTab === 'weekly') return formatWeeklyTabLabel(getRangeForPeriod('weekly'))
    if (periodTab === 'monthly') return formatMonthlyTabLabel()
    if (periodTab === 'custom' && appliedCustomRange) return formatRangeLabel(appliedCustomRange)
    return formatRangeLabel(activeRange)
  }, [periodTab, appliedCustomRange, activeRange])

  const reportFilters = useMemo((): ReportFilters => {
    const hostelBlock =
      fixedHostelBlock != null
        ? fixedHostelBlock
        : blockFilter.trim()
          ? blockFilter
          : null

    return {
      start: activeRange.start,
      end: activeRange.end,
      hostelBlock,
      department: departmentFilter.trim() || null,
    }
  }, [activeRange, fixedHostelBlock, blockFilter, departmentFilter])

  const { rows, stats, loading, error, fetchAllForExport } = useReportData(reportFilters)

  const exportReportType = reportTypeLabel(periodTab)
  const exportDateLabel = dateSubtitle

  async function handleExport(format: ReportExportFormat) {
    setExporting(format)
    setExportToast(null)
    try {
      const exportRows = await fetchAllForExport()
      const exportOptions = {
        rows: exportRows,
        filters: {
          reportType: exportReportType,
          dateLabel: exportDateLabel,
          hostelBlock: reportFilters.hostelBlock,
          department: reportFilters.department,
        },
        stats,
      }

      const filename =
        format === 'pdf'
          ? (await import('@/utils/report-export/export-pdf')).exportReportToPdf(exportOptions)
          : (await import('@/utils/report-export/export-excel')).exportReportToExcel(
              exportOptions,
            )

      setExportToast(`Report downloaded: ${filename}`)
      window.setTimeout(() => setExportToast(null), 5000)
    } catch (err) {
      setExportToast(err instanceof Error ? err.message : 'Export failed')
      window.setTimeout(() => setExportToast(null), 5000)
    } finally {
      setExporting(null)
    }
  }

  function handleApplyCustomRange() {
    const range = getCustomRange(customFrom, customTo)
    if (range) setAppliedCustomRange(range)
  }

  function handleTabClick(tabId: ReportTab) {
    if (tabId !== 'aggregate') {
      setPeriodTab(tabId)
    }
    setActiveTab(tabId)
  }

  const tabs = showAggregateTab ? [...PERIOD_TABS, AGGREGATE_TAB] : PERIOD_TABS

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={dateSubtitle}
        actions={
          activeTab !== 'aggregate' ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => handleExport('xlsx')}
                disabled={exporting !== null}
                className="bg-[#1A5CA0] text-white hover:bg-[#154a85]"
              >
                {exporting === 'xlsx' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                    Preparing export...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
                    Export to Excel
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
                className="bg-[#1A5CA0] text-white hover:bg-[#154a85]"
              >
                {exporting === 'pdf' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                    Preparing export...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" strokeWidth={1.75} />
                    Export to PDF
                  </>
                )}
              </Button>
            </div>
          ) : undefined
        }
      />

      {exportToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm font-medium text-[#166534] shadow-lg">
          {exportToast}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              activeTab === tab.id ? 'dashboard-filter-chip-active' : 'dashboard-filter-chip',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'custom' && (
        <div className="dashboard-surface-muted flex flex-wrap items-end gap-3 p-4">
          <div>
            <Label htmlFor="report-from" className="text-xs">
              From
            </Label>
            <Input
              id="report-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="mt-1 h-9 w-40"
            />
          </div>
          <div>
            <Label htmlFor="report-to" className="text-xs">
              To
            </Label>
            <Input
              id="report-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="mt-1 h-9 w-40"
            />
          </div>
          <Button type="button" size="sm" onClick={handleApplyCustomRange}>
            Apply
          </Button>
        </div>
      )}

      {(showBlockFilter || showDepartmentFilter) && (
        <div className="dashboard-surface-muted flex flex-wrap items-end gap-3 p-4">
          {showBlockFilter && (
            <div>
              <Label htmlFor="report-block" className="text-xs">
                Block
              </Label>
              <select
                id="report-block"
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                className="mt-1 h-9 w-36 rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                <option value="">All blocks</option>
                {blockOptions.map((block) => (
                  <option key={block} value={block}>
                    Block {block}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showDepartmentFilter && (
            <div>
              <Label htmlFor="report-department" className="text-xs">
                Department
              </Label>
              <select
                id="report-department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="mt-1 h-9 min-w-[10rem] rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                <option value="">All departments</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {activeTab !== 'aggregate' && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total requests" value={stats.total} iconTone="blue" />
          <StatCard
            label="Approved"
            value={stats.approved}
            iconTone="green"
            valueClassName="text-[#166534]"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            iconTone="red"
            valueClassName="text-[#991B1B]"
          />
          <StatCard
            label="Overdue"
            value={stats.overdue}
            iconTone="red"
            valueClassName={stats.overdue > 0 ? 'text-[#DC2626]' : undefined}
          />
        </div>
      )}

      {activeTab === 'aggregate' ? (
        loading ? (
          <div className="dashboard-loading-panel">
            <Spinner label="Loading aggregate summary…" />
          </div>
        ) : (
          <ReportAggregateTable rows={rows} />
        )
      ) : (
        <div className="dashboard-surface">
          <DataTable
            columns={REPORT_COLUMNS}
            data={rows}
            loading={loading}
            emptyMessage="No outpass records in this period."
            className="min-w-full"
            tableClassName="min-w-[2400px]"
            getRowKey={(row, index) => row.outpass_id ?? `${row.reg_number}-${index}`}
            getRowClassName={(row) => (row.is_overdue ? 'bg-[#FEF2F2] hover:bg-[#FEE2E2]' : undefined)}
          />
        </div>
      )}
    </div>
  )
}
