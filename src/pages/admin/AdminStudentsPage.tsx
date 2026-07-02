import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminStudentDrawer } from '@/components/admin/AdminStudentDrawer'
import {
  AdminStudentsYearGroup,
  groupStudentsByYear,
} from '@/components/admin/AdminStudentsYearGroup'
import { DashboardFilterChip } from '@/components/ui/DashboardFilterChip'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAdminStudents } from '@/hooks/admin/useAdminStudents'
import type { AdminStudentRow } from '@/lib/admin-types'
import { formatBlockLabel } from '@/lib/block-display'
import { formatStudentYearLabel } from '@/lib/student-year'

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

  const yearGroups = useMemo(() => groupStudentsByYear(students), [students])

  useEffect(() => {
    const id = searchParams.get('student')
    if (!id) return
    const student = allStudents.find((s) => s.id === id)
    if (student) setSelected(student)
  }, [searchParams, allStudents])

  function openStudent(student: AdminStudentRow) {
    setSelected(student)
    setSearchParams({ student: student.id })
  }

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading students…" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
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

      <div className="dashboard-surface-muted space-y-4 p-4 sm:p-5">
        <h2 className="dashboard-heading text-sm font-semibold">Search &amp; filters</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Input
            placeholder="Search name or reg no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lg:col-span-1"
          />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-10 rounded-xl border border-white/60 bg-white/70 px-3 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1A5CA0]"
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={yearFilter === 'all' ? 'all' : String(yearFilter)}
            onChange={(e) =>
              setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="h-10 rounded-xl border border-white/60 bg-white/70 px-3 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1A5CA0]"
          >
            <option value="all">All years</option>
            {[1, 2, 3, 4].map((y) => (
              <option key={y} value={y}>
                {formatStudentYearLabel(y)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Hostel block</p>
          <div className="flex flex-wrap gap-2">
            <DashboardFilterChip
              active={blockFilter === 'all'}
              onSelect={() => setBlockFilter('all')}
              onDeselect={() => setBlockFilter('all')}
            >
              All blocks
            </DashboardFilterChip>
            {blocks.map((block) => (
              <DashboardFilterChip
                key={block}
                active={blockFilter === block}
                onSelect={() => setBlockFilter(block)}
                onDeselect={() => setBlockFilter('all')}
              >
                {formatBlockLabel(block)}
              </DashboardFilterChip>
            ))}
          </div>
        </div>
      </div>

      {yearGroups.length === 0 ? (
        <div className="dashboard-surface px-6 py-12 text-center text-sm text-slate-600">
          No students match your filters.
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-10">
          {yearGroups.map((group) => (
            <AdminStudentsYearGroup
              key={group.year}
              year={group.year}
              students={group.students}
              onSelectStudent={openStudent}
              onDeactivateStudent={deactivateStudent}
              onRefetch={refetch}
            />
          ))}
        </div>
      )}

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
