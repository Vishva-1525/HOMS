import { useMemo, useState } from 'react'
import { IconDownload } from '@tabler/icons-react'
import { WardenStatCard } from '@/components/warden/WardenStatCard'
import { PassTypeBadge } from '@/components/student/PassTypeBadge'
import { StatusChip } from '@/components/student/StatusChip'
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
import { cn } from '@/lib/utils'

const PERIOD_TABS: { id: ReportPeriod; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
]

export function ReportsPage() {
  const { passes, gateLogs, loading, error } = useWardenDataContext()
  const [period, setPeriod] = useState<ReportPeriod>('daily')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exporting, setExporting] = useState(false)

  const customRange = useMemo(
    () => getCustomRange(customFrom, customTo),
    [customFrom, customTo],
  )

  const activeRange = useMemo(() => {
    if (customRange) return customRange
    return getRangeForPeriod(period)
  }, [customRange, period])

  const exportPeriodLabel = customRange ? 'Custom' : period.charAt(0).toUpperCase() + period.slice(1)

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
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Spinner label="Loading report data..." />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatRangeLabel(activeRange)}
            {customRange && ' (custom range)'}
          </p>
        </div>
        <Button
          type="button"
          onClick={handleExport}
          disabled={exporting || tableRows.length === 0}
        >
          <IconDownload className="h-4 w-4" stroke={1.75} />
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPeriod(tab.id)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              !customRange && period === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <p className="w-full text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Custom date range
        </p>
        <div>
          <Label htmlFor="report-from" className="text-xs">
            From
          </Label>
          <Input
            id="report-from"
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-9 w-40"
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
            className="h-9 w-40"
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

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <WardenStatCard label="Total requests" value={stats.total} />
        <WardenStatCard
          label="Approved"
          value={stats.approved}
          valueClassName="text-green-600"
        />
        <WardenStatCard
          label="Rejected"
          value={stats.rejected}
          valueClassName="text-red-600"
        />
        <WardenStatCard
          label="Overdue"
          value={stats.overdue}
          valueClassName="text-amber-600"
        />
        <WardenStatCard
          label="Currently out"
          value={stats.currentlyOut}
          valueClassName="text-blue-600"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Reg No</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Pass type</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Departure</th>
                <th className="px-4 py-3">Return by</th>
                <th className="px-4 py-3">Actual entry</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Warden remark</th>
              </tr>
            </thead>
            <tbody>
              {filteredPasses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    No outpass records in this period.
                  </td>
                </tr>
              ) : (
                filteredPasses.map((pass) => {
                  const entryTime = getEntryTime(pass.id, gateLogs)
                  return (
                    <tr key={pass.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        {getStudentName(pass.students)}
                      </td>
                      <td className="px-4 py-3">{getStudentReg(pass.students)}</td>
                      <td className="px-4 py-3">{getStudentRoom(pass.students)}</td>
                      <td className="px-4 py-3">
                        <PassTypeBadge type={pass.pass_type} />
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3">{pass.destination}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatReturnTime(pass.departure_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatReturnTime(pass.return_by)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {entryTime ? formatReturnTime(entryTime) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={pass.status} />
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground">
                        {pass.warden_remark ?? '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
