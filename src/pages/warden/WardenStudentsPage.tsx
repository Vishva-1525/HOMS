import { useEffect, useState, lazy, Suspense } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthProvider'
import { fetchWardenBlockAssignment } from '@/hooks/useReportData'
import type { BulkImportResult } from '@/lib/bulk-student-import'
import { formatBlockLabel } from '@/lib/block-display'

const BulkStudentUploadModal = lazy(() =>
  import('@/components/admin/BulkStudentUploadModal').then((m) => ({
    default: m.BulkStudentUploadModal,
  })),
)

export function WardenStudentsPage() {
  const { user } = useAuth()
  const [importOpen, setImportOpen] = useState(false)
  const [importBanner, setImportBanner] = useState<string | null>(null)
  const [block, setBlock] = useState<string | null>(null)
  const [blockLoading, setBlockLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setBlock(null)
      setBlockLoading(false)
      return
    }

    let cancelled = false
    setBlockLoading(true)
    void fetchWardenBlockAssignment(user.id).then((value) => {
      if (!cancelled) {
        setBlock(value)
        setBlockLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  function handleImportSuccess(result: BulkImportResult) {
    const imported = result.importedCount ?? 0
    const updated = result.updatedCount ?? 0
    const succeeded = imported + updated
    const failed = result.errorCount ?? result.errors?.length ?? 0
    setImportBanner(
      `Successfully imported ${succeeded} students.${failed > 0 ? ` ${failed} failed.` : ''}${
        updated > 0 ? ` (${imported} new, ${updated} updated)` : ''
      }`,
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="dashboard-page-header flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="dashboard-heading text-2xl md:text-3xl">Students</h1>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="shrink-0 gap-1.5 self-start"
          disabled={blockLoading}
          onClick={() => {
            setImportBanner(null)
            setImportOpen(true)
          }}
        >
          <Upload className="h-4 w-4" />
          Import students
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

      <section className="dashboard-surface space-y-3 p-5 sm:p-6">
        <h2 className="dashboard-section-heading text-base">
          <span className="dashboard-section-accent" aria-hidden />
          Bulk import
        </h2>
        {blockLoading ? (
          <p className="py-2 text-sm text-slate-600">Loading your block assignment…</p>
        ) : block ? (
          <p className="rounded-xl border border-[#1A5CA0]/20 bg-[#EBF3FF]/70 px-3 py-2 text-sm text-[#0D3F72]">
            Assigned block: <span className="font-semibold">{formatBlockLabel(block)}</span>
          </p>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            No hostel block assigned yet
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          disabled={blockLoading}
          onClick={() => {
            setImportBanner(null)
            setImportOpen(true)
          }}
        >
          <Upload className="h-4 w-4" />
          Choose file
        </Button>
      </section>

      <Suspense fallback={null}>
        <BulkStudentUploadModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onSuccess={handleImportSuccess}
          allowReplace={false}
          forcedHostelBlock={block}
          title="Import students"
        />
      </Suspense>
    </div>
  )
}
