import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, UserX } from 'lucide-react'
import { AdminStudentDrawer } from '@/components/admin/AdminStudentDrawer'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAdminStudents } from '@/hooks/admin/useAdminStudents'
import type { AdminStudentRow } from '@/lib/admin-types'
import { cn } from '@/lib/utils'

export function AdminStudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    students,
    blocks,
    departments,
    summary,
    loading,
    error,
    search,
    setSearch,
    blockFilter,
    setBlockFilter,
    departmentFilter,
    setDepartmentFilter,
    yearFilter,
    setYearFilter,
    deactivateStudent,
    updateStudent,
    getStudentPasses,
    gateLogs,
    allStudents,
    refetch,
  } = useAdminStudents()

  const [selected, setSelected] = useState<AdminStudentRow | null>(null)

  useEffect(() => {
    const id = searchParams.get('student')
    if (!id) return
    const student = allStudents.find((s) => s.id === id)
    if (student) setSelected(student)
  }, [searchParams, allStudents])

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading students…" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-page-header">
        <h1 className="dashboard-heading text-xl md:text-2xl">Students</h1>
        <p className="dashboard-subheading mt-1.5 text-sm">
          {summary.active} students · {summary.outside} currently out · {summary.overdue} overdue
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name or reg no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={yearFilter === 'all' ? 'all' : String(yearFilter)}
          onChange={(e) =>
            setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
        >
          <option value="all">All years</option>
          {[1, 2, 3, 4].map((y) => (
            <option key={y} value={y}>{y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} year</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={blockFilter === 'all'} onClick={() => setBlockFilter('all')}>
          All blocks
        </FilterChip>
        {blocks.map((block) => (
          <FilterChip key={block} active={blockFilter === block} onClick={() => setBlockFilter(block)}>
            Block {block}
          </FilterChip>
        ))}
      </div>

      <div className="dashboard-surface overflow-hidden">
        <DataTable
          data={students}
          getRowKey={(row) => row.id}
          getRowClassName={() => 'cursor-pointer'}
          onRowClick={(row) => {
            setSelected(row)
            setSearchParams({ student: row.id })
          }}
          emptyMessage="No students match your filters."
          columns={[
            {
              header: 'Name',
              accessor: 'id',
              render: (row) => row.profiles?.full_name ?? '—',
            },
            { header: 'Reg No', accessor: 'reg_number' },
            { header: 'Room', accessor: 'room_number' },
            { header: 'Block', accessor: 'hostel_block' },
            { header: 'Dept', accessor: 'department' },
            { header: 'Year', accessor: 'year_of_study' },
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
              render: (row) => (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                    aria-label="Edit"
                    onClick={() => {
                      setSelected(row)
                      setSearchParams({ student: row.id })
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {row.is_active && (
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      aria-label="Deactivate"
                      onClick={async () => {
                        await deactivateStudent(row.id)
                        await refetch()
                      }}
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      <AdminStudentDrawer
        student={selected}
        passes={selected ? getStudentPasses(selected.id) : []}
        gateLogs={gateLogs}
        onClose={() => {
          setSelected(null)
          setSearchParams({})
        }}
        onDeactivate={deactivateStudent}
        onSave={updateStudent}
      />
    </div>
  )
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-[#1A5CA0] text-white'
          : 'bg-white/60 text-slate-700 hover:bg-white/80',
      )}
    >
      {children}
    </button>
  )
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
