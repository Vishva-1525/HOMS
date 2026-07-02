import { useMemo } from 'react'
import { AdminStudentRowActions } from '@/components/admin/AdminStudentRowActions'
import { DataTable } from '@/components/ui/DataTable'
import type { AdminStudentRow } from '@/lib/admin-types'
import { formatBlockLabel } from '@/lib/block-display'
import { formatStudentYearLabel, STUDENT_YEAR_ORDER } from '@/lib/student-year'
import { cn } from '@/lib/utils'

interface AdminStudentsYearGroupProps {
  year: number
  students: AdminStudentRow[]
  onSelectStudent: (student: AdminStudentRow) => void
  onDeactivateStudent: (studentId: string) => Promise<void>
  onRefetch: () => Promise<void>
}

function CampusBadge({ status }: { status: AdminStudentRow['campus_status'] }) {
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

export function AdminStudentsYearGroup({
  year,
  students,
  onSelectStudent,
  onDeactivateStudent,
  onRefetch,
}: AdminStudentsYearGroupProps) {
  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.reg_number.localeCompare(b.reg_number)),
    [students],
  )

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h2 className="dashboard-section-heading text-lg sm:text-xl">
            <span className="dashboard-section-accent h-6" aria-hidden />
            {formatStudentYearLabel(year)}
          </h2>
          <p className="dashboard-muted mt-1 text-sm">
            {sortedStudents.length} student{sortedStudents.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="dashboard-surface overflow-hidden">
        <DataTable
          data={sortedStudents}
          getRowKey={(row) => row.id}
          getRowClassName={() => 'cursor-pointer'}
          onRowClick={onSelectStudent}
          emptyMessage="No students in this year."
          columns={[
            {
              header: 'Name',
              accessor: 'id',
              render: (row) => (
                <span className="font-medium text-slate-900">
                  {row.profiles?.full_name ?? '—'}
                </span>
              ),
            },
            { header: 'Reg No', accessor: 'reg_number' },
            { header: 'Room', accessor: 'room_number' },
            {
              header: 'Block',
              accessor: 'hostel_block',
              render: (row) => formatBlockLabel(row.hostel_block),
            },
            { header: 'Dept', accessor: 'department' },
            { header: 'Parent phone', accessor: 'parent_phone' },
            {
              header: 'Status',
              accessor: 'is_active',
              render: (row) => (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    row.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600',
                  )}
                >
                  {row.is_active ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            {
              header: 'Campus',
              accessor: 'campus_status',
              render: (row) => <CampusBadge status={row.campus_status} />,
            },
            {
              header: 'Actions',
              accessor: 'id',
              width: '108px',
              headerClassName: 'admin-table-actions-head',
              cellClassName: 'admin-table-actions-cell',
              render: (row) => (
                <AdminStudentRowActions
                  student={row}
                  onEdit={() => onSelectStudent(row)}
                  onDeactivate={async () => {
                    await onDeactivateStudent(row.id)
                    await onRefetch()
                  }}
                />
              ),
            },
          ]}
          mobileCardRender={(row) => (
            <div className="space-y-3 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{row.profiles?.full_name ?? '—'}</p>
                  <p className="dashboard-muted mt-0.5 text-xs">{row.reg_number}</p>
                </div>
                <CampusBadge status={row.campus_status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <span>Room {row.room_number}</span>
                <span>{formatBlockLabel(row.hostel_block)}</span>
                <span className="col-span-2">{row.department}</span>
              </div>
              <AdminStudentRowActions
                student={row}
                onEdit={() => onSelectStudent(row)}
                onDeactivate={async () => {
                  await onDeactivateStudent(row.id)
                  await onRefetch()
                }}
              />
            </div>
          )}
        />
      </div>
    </section>
  )
}

export function groupStudentsByYear(students: AdminStudentRow[]): { year: number; students: AdminStudentRow[] }[] {
  const map = new Map<number, AdminStudentRow[]>()

  for (const student of students) {
    const year = student.year_of_study
    const bucket = map.get(year) ?? []
    bucket.push(student)
    map.set(year, bucket)
  }

  const orderedYears = [
    ...STUDENT_YEAR_ORDER.filter((year) => map.has(year)),
    ...[...map.keys()]
      .filter((year) => !STUDENT_YEAR_ORDER.includes(year as (typeof STUDENT_YEAR_ORDER)[number]))
      .sort((a, b) => a - b),
  ]

  return orderedYears.map((year) => ({
    year,
    students: map.get(year) ?? [],
  }))
}
