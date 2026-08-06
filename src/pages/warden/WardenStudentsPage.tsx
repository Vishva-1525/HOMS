import { StudentAvatar } from '@/components/shared/StudentAvatar'
import { DashboardErrorPanel } from '@/components/ui/DashboardErrorPanel'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  useWardenBlockStudents,
  type WardenBlockStudent,
} from '@/hooks/warden/useWardenBlockStudents'
import { formatBlockLabel } from '@/lib/block-display'
import { formatStudentYearLabel } from '@/lib/student-year'
import { cn } from '@/lib/utils'

function CampusBadge({ status }: { status: WardenBlockStudent['campus_status'] }) {
  const styles = {
    inside: 'bg-emerald-100 text-emerald-800',
    outside: 'bg-blue-100 text-blue-800',
    overdue: 'bg-red-100 text-red-800',
  }
  const labels = { inside: 'Inside', outside: 'Outside', overdue: 'Overdue' }

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', styles[status])}>
      {labels[status]}
    </span>
  )
}

export function WardenStudentsPage() {
  const {
    students,
    totalCount,
    blockLabel,
    scope,
    search,
    setSearch,
    loading,
    error,
    refetch,
  } = useWardenBlockStudents()

  const titleBlock =
    scope?.tier === 'rt' && blockLabel
      ? formatBlockLabel(blockLabel)
      : scope?.tier === 'superior'
        ? 'Escalated blocks'
        : null

  if (loading && students.length === 0) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading students…" />
      </div>
    )
  }

  if (error && students.length === 0) {
    return (
      <DashboardErrorPanel
        error={error}
        title="Couldn’t load students"
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="dashboard-page-header">
        <h1 className="dashboard-heading text-2xl md:text-3xl">
          {titleBlock ? `Students · ${titleBlock}` : 'Students'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {totalCount} student{totalCount === 1 ? '' : 's'}
          {scope?.tier === 'superior' && blockLabel ? ` · ${blockLabel}` : ''}
        </p>
      </div>

      <div className="dashboard-surface space-y-4 p-4 sm:p-5">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, register number, room…"
          className="max-w-md"
        />

        <DataTable
          data={students}
          loading={loading}
          emptyMessage={
            search.trim()
              ? 'No students match this search.'
              : 'No students found for your block.'
          }
          getRowKey={(row) => row.id}
          stickyHeader
          mobileCardRender={(row) => (
            <div className="flex gap-3 px-1 py-3.5">
              <StudentAvatar name={row.full_name} photoUrl={row.avatar_url} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="truncate font-semibold text-slate-900">{row.full_name}</p>
                  <CampusBadge status={row.campus_status} />
                </div>
                <p className="mt-0.5 font-mono text-xs text-slate-600">{row.reg_number}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Room {row.room_number || '-'}
                  {row.year_of_study > 0 ? ` · ${formatStudentYearLabel(row.year_of_study)}` : ''}
                  {row.department ? ` · ${row.department}` : ''}
                </p>
              </div>
            </div>
          )}
          columns={[
            {
              header: 'Name',
              accessor: 'full_name',
              render: (row) => (
                <div className="flex items-center gap-3">
                  <StudentAvatar name={row.full_name} photoUrl={row.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{row.full_name}</p>
                    <p className="font-mono text-xs text-slate-500">{row.reg_number}</p>
                  </div>
                </div>
              ),
            },
            {
              header: 'Room',
              accessor: 'room_number',
              render: (row) => row.room_number || '-',
            },
            {
              header: 'Year',
              accessor: 'year_of_study',
              render: (row) =>
                row.year_of_study > 0 ? formatStudentYearLabel(row.year_of_study) : '-',
            },
            {
              header: 'Department',
              accessor: 'department',
              render: (row) => row.department || '-',
            },
            {
              header: 'Parent phone',
              accessor: 'parent_phone',
              render: (row) => row.parent_phone || '-',
            },
            {
              header: 'Status',
              accessor: 'campus_status',
              render: (row) => <CampusBadge status={row.campus_status} />,
            },
          ]}
        />
      </div>
    </div>
  )
}
