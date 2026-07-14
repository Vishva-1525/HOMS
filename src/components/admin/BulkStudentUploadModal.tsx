import { useCallback, useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, Upload, AlertTriangle } from 'lucide-react'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import {
  getCsvTemplate,
  getXlsxTemplateBlob,
  parseStudentImportFile,
  type ParsedStudentImportRow,
  type StudentImportMode,
  type BulkImportResult,
} from '@/lib/bulk-student-import'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const CHUNK_SIZE = 100

interface BulkStudentUploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (result: BulkImportResult) => void
}

interface ChunkFailState {
  chunkIndex: number
  message: string
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function emptyTotals(): BulkImportResult {
  return {
    success: true,
    importedCount: 0,
    updatedCount: 0,
    errorCount: 0,
    errors: [],
    newAccounts: [],
  }
}

function mergeChunkResult(acc: BulkImportResult, chunk: BulkImportResult): BulkImportResult {
  return {
    success: acc.success && chunk.success !== false,
    importedCount: (acc.importedCount ?? 0) + (chunk.importedCount ?? 0),
    updatedCount: (acc.updatedCount ?? 0) + (chunk.updatedCount ?? 0),
    errorCount: (acc.errorCount ?? 0) + (chunk.errorCount ?? chunk.errors?.length ?? 0),
    errors: [...(acc.errors ?? []), ...(chunk.errors ?? [])],
    newAccounts: [...(acc.newAccounts ?? []), ...(chunk.newAccounts ?? [])],
  }
}

export function BulkStudentUploadModal({ open, onClose, onSuccess }: BulkStudentUploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<StudentImportMode>('append')
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedStudentImportRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [processedCount, setProcessedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [chunkFail, setChunkFail] = useState<ChunkFailState | null>(null)

  /** Holds in-progress aggregates across pause/retry. */
  const runRef = useRef<{
    chunks: ParsedStudentImportRow[][]
    nextIndex: number
    selectedMode: StudentImportMode
    totals: BulkImportResult
    totalRows: number
  } | null>(null)

  const progressPct = useMemo(() => {
    if (totalCount <= 0) return 0
    return Math.min(100, Math.round((processedCount / totalCount) * 100))
  }, [processedCount, totalCount])

  const resetProgress = useCallback(() => {
    setProcessedCount(0)
    setTotalCount(0)
    setCurrentChunk(0)
    setTotalChunks(0)
    setChunkFail(null)
    runRef.current = null
  }, [])

  const resetFileState = useCallback(() => {
    setFileName(null)
    setRows([])
    setParseErrors([])
    setSubmitError(null)
    resetProgress()
    if (inputRef.current) inputRef.current.value = ''
  }, [resetProgress])

  const handleClose = useCallback(() => {
    if (submitting) return
    resetFileState()
    setImportMode('append')
    onClose()
  }, [onClose, resetFileState, submitting])

  async function handleFile(file: File | null | undefined) {
    setSubmitError(null)
    resetProgress()
    if (!file) {
      resetFileState()
      return
    }

    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setParseErrors(['Please upload a .csv or .xlsx file.'])
      setFileName(file.name)
      setRows([])
      return
    }

    setFileName(file.name)
    const { rows: parsed, errors } = await parseStudentImportFile(file)
    setRows(parsed)
    setParseErrors(errors)
  }

  function downloadCsvTemplate() {
    const blob = new Blob([getCsvTemplate()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'homs-students-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadXlsxTemplate() {
    const blob = getXlsxTemplateBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'homs-students-import-template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function invokeChunk(
    chunk: ParsedStudentImportRow[],
    mode: StudentImportMode,
  ): Promise<BulkImportResult> {
    const { data, error } = await supabase.functions.invoke('bulk-import-students', {
      body: {
        importMode: mode,
        students: chunk,
      },
    })

    if (error) {
      throw new Error(error.message || 'Import request failed')
    }

    const result = (data ?? {}) as BulkImportResult
    if (result.success === false && result.error) {
      throw new Error(result.error)
    }
    return result
  }

  async function processFrom(startIndex: number) {
    const run = runRef.current
    if (!run) return

    setSubmitting(true)
    setSubmitError(null)
    setChunkFail(null)

    try {
      for (let i = startIndex; i < run.chunks.length; i += 1) {
        run.nextIndex = i
        setCurrentChunk(i + 1)

        // Replace soft-delete ONLY on the first chunk; later chunks must append.
        const chunkMode: StudentImportMode =
          run.selectedMode === 'replace' && i === 0 ? 'replace' : 'append'

        try {
          const result = await invokeChunk(run.chunks[i], chunkMode)
          run.totals = mergeChunkResult(run.totals, result)
          const advance = run.chunks[i].length
          setProcessedCount((prev) => Math.min(run.totalRows, prev + advance))
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Chunk import failed'
          setChunkFail({ chunkIndex: i, message })
          setSubmitError(
            `Chunk ${i + 1} of ${run.chunks.length} failed: ${message}. Choose Retry, Skip, or Cancel.`,
          )
          setSubmitting(false)
          return
        }
      }

      const finalResult: BulkImportResult = {
        ...run.totals,
        success: true,
        importMode: run.selectedMode,
        errorCount: run.totals.errors?.length ?? 0,
      }

      resetFileState()
      setImportMode('append')
      onSuccess(finalResult)
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit() {
    if (rows.length === 0 || parseErrors.length > 0) return

    const chunks = chunkArray(rows, CHUNK_SIZE)
    runRef.current = {
      chunks,
      nextIndex: 0,
      selectedMode: importMode,
      totals: emptyTotals(),
      totalRows: rows.length,
    }

    setTotalCount(rows.length)
    setProcessedCount(0)
    setTotalChunks(chunks.length)
    setCurrentChunk(0)
    setChunkFail(null)
    setSubmitError(null)

    await processFrom(0)
  }

  async function handleRetryChunk() {
    if (!runRef.current || chunkFail == null) return
    await processFrom(chunkFail.chunkIndex)
  }

  async function handleSkipChunk() {
    if (!runRef.current || chunkFail == null) return
    const run = runRef.current
    const failed = run.chunks[chunkFail.chunkIndex] ?? []
    run.totals = mergeChunkResult(run.totals, {
      success: false,
      importedCount: 0,
      updatedCount: 0,
      errorCount: failed.length,
      errors: failed.map((row) => ({
        email: row.email,
        reg_number: row.reg_number,
        message: `Skipped after chunk failure: ${chunkFail.message}`,
      })),
    })
    setProcessedCount((prev) => Math.min(run.totalRows, prev + failed.length))
    await processFrom(chunkFail.chunkIndex + 1)
  }

  function handleCancelImport() {
    resetProgress()
    setSubmitting(false)
    setSubmitError('Import cancelled.')
  }

  return (
    <Modal
      open={open}
      title="Import students"
      onClose={handleClose}
      className="max-w-xl bg-white"
      footer={
        chunkFail ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleCancelImport} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={() => void handleSkipChunk()} disabled={submitting}>
              Skip chunk
            </Button>
            <Button type="button" variant="primary" onClick={() => void handleRetryChunk()} loading={submitting}>
              Retry chunk
            </Button>
          </div>
        ) : (
          <ModalFooter
            onCancel={handleClose}
            onConfirm={() => void handleSubmit()}
            confirmLabel={
              submitting
                ? 'Importing…'
                : importMode === 'replace'
                  ? 'Archive & import'
                  : 'Import students'
            }
            confirmVariant={importMode === 'replace' ? 'destructive' : 'default'}
            loading={submitting}
            confirmDisabled={rows.length === 0 || parseErrors.length > 0 || submitting}
          />
        )
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-slate-900">Import mode</p>
          <div className="mt-2 space-y-2">
            <label
              className={cn(
                'flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors',
                importMode === 'append'
                  ? 'border-[#1A5CA0] bg-[#EBF3FF]'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <input
                type="radio"
                name="import-mode"
                className="mt-1 accent-[#1A5CA0]"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                disabled={submitting || Boolean(chunkFail)}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Append &amp; Update</span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  Adds new students and updates room, block, department, and year for existing register
                  numbers.
                </span>
              </span>
            </label>

            <label
              className={cn(
                'flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors',
                importMode === 'replace'
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <input
                type="radio"
                name="import-mode"
                className="mt-1 accent-amber-600"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                disabled={submitting || Boolean(chunkFail)}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">New Academic Year</span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  Archives all current students, then imports only this list as active.
                </span>
                {importMode === 'replace' && (
                  <span className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Soft-delete runs once on the first batch only. Later batches append so prior chunks
                    stay active.
                  </span>
                )}
              </span>
            </label>
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">CSV or Excel file</p>
            <div className="flex flex-wrap items-center gap-1">
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={downloadCsvTemplate}
                disabled={submitting}
              >
                CSV template
              </Button>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={downloadXlsxTemplate}
                disabled={submitting}
              >
                Excel template
              </Button>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (submitting) return
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
            }}
            onClick={() => {
              if (!submitting) inputRef.current?.click()
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (!submitting) setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              if (!submitting) void handleFile(e.dataTransfer.files?.[0])
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
              submitting && 'pointer-events-none opacity-60',
              dragOver
                ? 'border-[#1A5CA0] bg-[#EBF3FF]'
                : 'border-slate-300 bg-slate-50 hover:border-[#1A5CA0]/60 hover:bg-[#EBF3FF]/40',
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#1A5CA0] shadow-sm ring-1 ring-slate-200">
              {fileName ? <FileSpreadsheet className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
            </div>
            <p className="mt-3 text-sm font-medium text-slate-900">
              {fileName ?? 'Drag & drop CSV or Excel (.xlsx) here, or click to browse'}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Required: Email, Reg Number, Full Name, Phone, Year · Optional: Room, Block,
              Department
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Accepts .csv and .xlsx · Large files upload in batches of {CHUNK_SIZE}.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={submitting}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </div>
        </div>

        {rows.length > 0 && parseErrors.length === 0 && !submitting && !chunkFail && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Ready to import <span className="font-semibold">{rows.length}</span> student
            {rows.length === 1 ? '' : 's'}
            {rows.length > CHUNK_SIZE
              ? ` in ${Math.ceil(rows.length / CHUNK_SIZE)} batches of up to ${CHUNK_SIZE}.`
              : '.'}
          </div>
        )}

        {(submitting || chunkFail || processedCount > 0) && totalCount > 0 && (
          <div className="space-y-2 rounded-xl border border-[#1A5CA0]/20 bg-[#EBF3FF]/60 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="font-semibold text-[#0D3F72]">
                Importing students: {processedCount} / {totalCount}
              </p>
              <p className="tabular-nums text-xs font-medium text-slate-600">
                {progressPct}%
                {totalChunks > 0 ? ` · batch ${Math.min(currentChunk, totalChunks)}/${totalChunks}` : ''}
              </p>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-[#1A5CA0]/15"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalCount}
              aria-valuenow={processedCount}
              aria-label="Import progress"
            >
              <div
                className="h-full rounded-full bg-[#1A5CA0] transition-[width] duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {submitting && !chunkFail && (
              <p className="text-[11px] text-slate-600">
                Please keep this window open until the run finishes.
              </p>
            )}
          </div>
        )}

        {parseErrors.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <p className="font-semibold">Validation issues</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
              {parseErrors.slice(0, 8).map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
            {parseErrors.length > 8 && (
              <p className="mt-1 text-xs">+{parseErrors.length - 8} more…</p>
            )}
          </div>
        )}

        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {submitError}
          </div>
        )}
      </div>
    </Modal>
  )
}
