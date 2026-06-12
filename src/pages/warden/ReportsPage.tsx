import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { exportToExcel } from '@/lib/export-excel'
import { formatReturnTime } from '@/lib/outpass'
import {
  formatFilenameDate,
  formatRangeLabel,
  getCustomRange,
  getRangeForPeriod,
  type ReportPeriod,
} from '@/lib/report-dates'
import {
  REPORT_TABLE_HEADERS,
  buildReportTableRow,
  computeReportStats,
  filterPassesByRange,
  reportRowToArray,
} from '@/lib/warden-reports'
import { getEntryTime, getStudentName, getStudentReg, getStudentRoom } from '@/lib/warden'
import type { OutpassStatus, OutpassWithStudent } from '@/lib/types'
import type { StatusBadgeStatus } from '@/components/ui/StatusBadge'

function outpassStatusToBadge(status: OutpassStatus): StatusBadgeStatus {
  if (status === 'extended') return 'completed'
  return status
}
import { cn } from '@/lib/utils'

type ReportTab = ReportPeriod | 'custom'

const PERIOD_TABS: { id: ReportTab; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'custom', label: 'Custom range' },
]

export function ReportsPage() {
  const { passes, gateLogs, loading, error } = useWardenDataContext()
  const [activeTab, setActiveTab] = useState<ReportTab>('daily')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exporting, setExporting] = useState(false)

  const customRange = useMemo(
    () => getCustomRange(customFrom, customTo),
    [customFrom, customTo],
  )

  const activeRange = useMemo(() => {
    if (activeTab === 'custom') {
      return customRange ?? getRangeForPeriod('daily')
    }
    return getRangeForPeriod(activeTab)
  }, [activeTab, customRange])

  const exportPeriodLabel =
    activeTab === 'custom'
      ? 'Custom'
      : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)

  const filteredPasses = useMemo(
    () => filterPassesByRange(passes, activeRange),
    [passes, activeRange],
  )

  const stats = useMemo(
    () => computeReportStats(filteredPasses, gateLogs),
    [filteredPasses, gateLogs],
  )

  const tableRows = useMemo(
    () => filteredPasses.map((pass) => buildReportTableRow(pass, gateLogs)),
    [filteredPasses, gateLogs],
  )

  async function handleExport() {
    setExporting(true)
    try {
      const rows = tableRows.map(reportRowToArray)
      const filename = `SVCE_Outpass_${exportPeriodLabel}_${formatFilenameDate()}.xlsx`
      await exportToExcel([...REPORT_TABLE_HEADERS], rows, filename)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading report data…" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={formatRangeLabel(activeRange)}
        actions={
          <Button
            type="button"
            onClick={handleExport}
            disabled={exporting || tableRows.length === 0}
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            {exporting ? 'Exporting…' : 'Export to Excel'}
          </Button>
        }
      />

      {error && (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
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
          {(customFrom || customTo) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomFrom('')
                setCustomTo('')
              }}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
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
          iconTone="amber"
          valueClassName="text-[#D97706]"
        />
        <StatCard
          label="Currently out"
          value={stats.currentlyOut}
          iconTone="blue"
          valueClassName="text-[#1A5CA0]"
        />
      </div>

      <div className="dashboard-surface">
        <DataTable
          columns={[
            {
              header: 'Student',
              accessor: 'id',
              render: (row: OutpassWithStudent) => getStudentName(row.students),
            },
            {
              header: 'Reg No',
              accessor: 'id',
              render: (row) => getStudentReg(row.students),
            },
            {
              header: 'Room',
              accessor: 'id',
              render: (row) => getStudentRoom(row.students),
            },
            {
              header: 'Pass type',
              accessor: 'pass_type',
              render: (row) => <PassTypeBadge type={row.pass_type} />,
            },
            { header: 'Destination', accessor: 'destination' },
            {
              header: 'Departure',
              accessor: 'departure_at',
              render: (row) => formatReturnTime(row.departure_at),
            },
            {
              header: 'Return by',
              accessor: 'return_by',
              render: (row) => formatReturnTime(row.return_by),
            },
            {
              header: 'Actual entry',
              accessor: 'id',
              render: (row) => {
                const entry = getEntryTime(row.id, gateLogs)
                return entry ? formatReturnTime(entry) : '—'
              },
            },
            {
              header: 'Status',
              accessor: 'status',
              render: (row) => (
                <StatusBadge status={outpassStatusToBadge(row.status)} />
              ),
            },
            {
              header: 'Warden remark',
              accessor: 'warden_remark',
              render: (row) => row.warden_remark ?? '—',
            },
          ]}
          data={filteredPasses}
          emptyMessage="No outpass records in this period."
          getRowKey={(row) => row.id}
        />
      </div>
    </div>
  )
}
