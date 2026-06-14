import { useMemo } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Spinner } from '@/components/ui/spinner'
import { WardenStudentOutMobileCard } from '@/components/warden/WardenMobileCards'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { useCountdown } from '@/hooks/useCountdown'
import { formatReturnTime } from '@/lib/outpass'
import {
  getExitTime,
  getStudentName,
  getStudentRoom,
  isOverdueReturn,
  isStudentCurrentlyOut,
} from '@/lib/warden'
import type { OutpassWithStudent } from '@/lib/types'

function TimeRemainingCell({ returnBy }: { returnBy: string }) {
  const countdown = useCountdown(returnBy)
  const isPast = new Date(returnBy).getTime() < Date.now()

  return (
    <span className={`font-mono tabular-nums ${isPast ? 'text-[#991B1B]' : ''}`}>
      {isPast ? `Overdue ${countdown}` : countdown}
    </span>
  )
}

export function StudentsOutPage() {
  const { passes, gateLogs, loading, error } = useWardenDataContext()

  const studentsOut = useMemo(
    () => passes.filter((p) => isStudentCurrentlyOut(p, gateLogs)),
    [passes, gateLogs],
  )

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading students out…" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students out"
        subtitle={
          <span className="inline-flex items-center gap-2">
            Currently out
            <span className="rounded-[var(--radius-full)] bg-[#EBF3FF] px-2.5 py-0.5 text-xs font-semibold text-[#1A5CA0]">
              {studentsOut.length}
            </span>
          </span>
        }
      />

      {error && (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="dashboard-surface">
        <DataTable
          columns={[
            { header: 'Student', accessor: 'id', render: (row) => getStudentName(row.students) },
            { header: 'Room', accessor: 'id', render: (row) => getStudentRoom(row.students) },
            { header: 'Destination', accessor: 'destination' },
            {
              header: 'Exit time',
              accessor: 'id',
              render: (row) => {
                const exit = getExitTime(row.id, gateLogs)
                return exit ? formatReturnTime(exit) : '—'
              },
            },
            {
              header: 'Return by',
              accessor: 'return_by',
              render: (row) => formatReturnTime(row.return_by),
            },
            {
              header: 'Time remaining',
              accessor: 'return_by',
              render: (row) => <TimeRemainingCell returnBy={row.return_by} />,
            },
            {
              header: 'Status',
              accessor: 'id',
              render: (row) => (
                <StatusBadge
                  status={isOverdueReturn(row, gateLogs) ? 'overdue' : 'approved'}
                  label={isOverdueReturn(row, gateLogs) ? 'Overdue' : 'Out'}
                />
              ),
            },
          ]}
          data={studentsOut}
          emptyMessage="No students are currently out."
          getRowKey={(row) => row.id}
          getRowClassName={(row: OutpassWithStudent) =>
            isOverdueReturn(row, gateLogs) ? 'bg-[#FEF2F2] text-[#991B1B]' : undefined
          }
          mobileCardRender={(row) => (
            <WardenStudentOutMobileCard
              pass={row}
              gateLogs={gateLogs}
              timeRemaining={<TimeRemainingCell returnBy={row.return_by} />}
            />
          )}
        />
      </div>
    </div>
  )
}
