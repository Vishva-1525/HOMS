import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { AdminStudentDrawer } from '@/components/admin/AdminStudentDrawer'
import {
  AdminStudentsYearGroup,
  groupStudentsByYear,
} from '@/components/admin/AdminStudentsYearGroup'
import { DashboardFilterChip } from '@/components/ui/DashboardFilterChip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAdminStudents } from '@/hooks/admin/useAdminStudents'
import type { AdminStudentRow } from '@/lib/admin-types'
import type { BulkImportResult } from '@/lib/bulk-student-import'
import { formatBlockLabel } from '@/lib/block-display'
import { formatStudentYearLabel } from '@/lib/student-year'
import { supabase } from '@/lib/supabase'
import type { GateLog, OutpassRequest } from '@/lib/types'

const BulkStudentUploadModal = lazy(() =>
  import('@/components/admin/BulkStudentUploadModal').then((m) => ({
    default: m.BulkStudentUploadModal,
  })),
)

export function AdminStudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    students: studentsFromHook,
    data,
    totalCount,
    page,
    pageSize,
    totalPages,
    setPage,
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
    refetch,
  } = useAdminStudents()

  // Unwrap paginated hook payload safely (supports both `students` and `data`).
  const students = useMemo(
    () => (Array.isArray(studentsFromHook) ? studentsFromHook : Array.isArray(data) ? data : []),
    [studentsFromHook, data],
  )

  const [selected, setSelected] = useState<AdminStudentRow | null>(null)
  const [drawerPasses, setDrawerPasses] = useState<OutpassRequest[]>([])
  const [drawerGateLogs, setDrawerGateLogs] = useState<GateLog[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [importBanner, setImportBanner] = useState<string | null>(null)

  const yearGroups = useMemo(() => groupStudentsByYear(students), [students])

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, totalCount)

  useEffect(() => {
    const id = searchParams.get('student')
    if (!id) return
    const student = students.find((s) => s.id === id)
    if (student) setSelected(student)
  }, [searchParams, students])

  useEffect(() => {
    if (!selected) {
      setDrawerPasses([])
      setDrawerGateLogs([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const passes = await getStudentPasses(selected.id)
        if (cancelled) return
        setDrawerPasses(passes)
        const ids = passes.map((p) => p.id)
        if (ids.length === 0) {
          setDrawerGateLogs([])
          return
        }
        const { data: logs } = await supabase.from('gate_logs').select('*').in('outpass_id', ids)
        if (!cancelled) setDrawerGateLogs((logs ?? []) as GateLog[])
      } catch {
        if (!cancelled) {
          setDrawerPasses([])
          setDrawerGateLogs([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selected, getStudentPasses])

  function openStudent(student: AdminStudentRow) {
    setSelected(student)
    setSearchParams({ student: student.id })
  }

  async function handleImportSuccess(result: BulkImportResult) {
    const imported = result.importedCount ?? 0
    const updated = result.updatedCount ?? 0
    const succeeded = imported + updated
    const failed = result.errorCount ?? result.errors?.length ?? 0
    setImportBanner(
      `Successfully imported ${succeeded} students.${failed > 0 ? ` ${failed} failed.` : ''}${
        updated > 0 ? ` (${imported} new, ${updated} updated)` : ''
      }`,
    )
    await refetch()
  }

  if (loading && students.length === 0) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading students…" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="dashboard-page-header flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="dashboard-heading text-2xl md:text-3xl">Students</h1>
          <p className="dashboard-subheading mt-1.5 text-sm sm:text-[15px]">
            {summary.active} students · {summary.outside} currently out · {summary.overdue} overdue
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="shrink-0 gap-1.5 self-start"
          onClick={() => {
            setImportBanner(null)
            setImportOpen(true)
          }}
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </div>

      {importBanner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span>{importBanner}</span>
          <button
            type="button"
            className="font-semibold text-[#1A5CA0] hover:underline"
            onClick={() => setImportBanner(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="dashboard-surface-muted space-y-4 p-4 sm:p-5">
        <h2 className="dashboard-heading text-base font-bold">Search &amp; filters</h2>
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
            {(departments ?? []).map((d) => (
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
            {(blocks ?? []).map((block) => (
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

      {loading && students.length > 0 && (
        <p className="text-xs font-medium text-slate-500">Refreshing students…</p>
      )}

      {!students || students.length === 0 ? (
        <div className="dashboard-surface px-6 py-12 text-center text-sm text-slate-600">
          {error ? 'Unable to load students.' : 'No students found.'}
        </div>
      ) : yearGroups.length === 0 ? (
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

      <div className="flex items-center justify-between gap-4 text-sm text-slate-700">
        <p>
          Showing {rangeStart}–{rangeEnd} of {totalCount}
          {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage(Math.max(1, page - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page >= totalPages || loading || totalCount === 0}
            onClick={() => setPage(Math.min(totalPages, page + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <AdminStudentDrawer
        student={selected}
        passes={drawerPasses}
        gateLogs={drawerGateLogs}
        onClose={() => {
          setSelected(null)
          setSearchParams({})
        }}
        onDeactivate={deactivateStudent}
        onSave={updateStudent}
      />

      <Suspense fallback={null}>
        {importOpen && (
          <BulkStudentUploadModal
            open={importOpen}
            onClose={() => setImportOpen(false)}
            onSuccess={(result) => {
              void handleImportSuccess(result)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
