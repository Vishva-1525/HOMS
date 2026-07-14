import { useCallback, useRef, useState } from 'react'
import { FileSpreadsheet, Upload, AlertTriangle } from 'lucide-react'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import {
  getCsvTemplate,
  parseStudentCsv,
  type ParsedStudentImportRow,
  type StudentImportMode,
  type BulkImportResult,
} from '@/lib/bulk-student-import'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface BulkStudentUploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (result: BulkImportResult) => void
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

  const resetFileState = useCallback(() => {
    setFileName(null)
    setRows([])
    setParseErrors([])
    setSubmitError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const handleClose = useCallback(() => {
    if (submitting) return
    resetFileState()
    setImportMode('append')
    onClose()
  }, [onClose, resetFileState, submitting])

  async function handleFile(file: File | null | undefined) {
    setSubmitError(null)
    if (!file) {
      resetFileState()
      return
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseErrors(['Please upload a .csv file.'])
      setFileName(file.name)
      setRows([])
      return
    }

    setFileName(file.name)
    const { rows: parsed, errors } = await parseStudentCsv(file)
    setRows(parsed)
    setParseErrors(errors)
  }

  function downloadTemplate() {
    const blob = new Blob([getCsvTemplate()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'homs-students-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSubmit() {
    if (rows.length === 0 || parseErrors.length > 0) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const { data, error } = await supabase.functions.invoke('bulk-import-students', {
        body: {
          importMode,
          students: rows,
        },
      })

      if (error) {
        throw new Error(error.message || 'Import request failed')
      }

      const result = data as BulkImportResult
      if (!result?.success) {
        throw new Error(result?.error || 'Import failed')
      }

      resetFileState()
      setImportMode('append')
      onSuccess(result)
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Import students from CSV"
      onClose={handleClose}
      className="max-w-xl bg-white"
      footer={
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
                disabled={submitting}
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
                disabled={submitting}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">New Academic Year</span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  Archives all current students, then imports only this list as active.
                </span>
                {importMode === 'replace' && (
                  <span className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    This deactivates every existing student before importing. Historical passes are kept,
                    but inactive students cannot sign in for new requests.
                  </span>
                )}
              </span>
            </label>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">CSV file</p>
            <Button type="button" variant="link" size="sm" onClick={downloadTemplate}>
              Download template
            </Button>
          </div>

          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              void handleFile(e.dataTransfer.files?.[0])
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
              dragOver
                ? 'border-[#1A5CA0] bg-[#EBF3FF]'
                : 'border-slate-300 bg-slate-50 hover:border-[#1A5CA0]/60 hover:bg-[#EBF3FF]/40',
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#1A5CA0] shadow-sm ring-1 ring-slate-200">
              {fileName ? <FileSpreadsheet className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
            </div>
            <p className="mt-3 text-sm font-medium text-slate-900">
              {fileName ?? 'Drag & drop CSV here, or click to browse'}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Headers: Email, Reg Number, Full Name, Phone, Room, Block, Department, Year
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={submitting}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </div>
        </div>

        {rows.length > 0 && parseErrors.length === 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Ready to import <span className="font-semibold">{rows.length}</span> student
            {rows.length === 1 ? '' : 's'}.
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

        {submitting && (
          <p className="text-center text-xs font-medium text-[#1A5CA0]">
            Importing in batches — this may take a minute for large files…
          </p>
        )}
      </div>
    </Modal>
  )
}
