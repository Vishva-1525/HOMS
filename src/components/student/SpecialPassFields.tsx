import { Upload } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { SPECIAL_PASS_PURPOSES } from '@/lib/special-pass'
import type { SpecialPassPurpose } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SpecialPassFieldsProps {
  purpose: SpecialPassPurpose | null
  remarks: string
  documentFile: File | null
  errors?: {
    specialPurpose?: string
    specialRemarks?: string
    documentFile?: string
  }
  disabled?: boolean
  onPurposeChange: (purpose: SpecialPassPurpose) => void
  onRemarksChange: (remarks: string) => void
  onDocumentChange: (file: File | null) => void
}

export function SpecialPassFields({
  purpose,
  remarks,
  documentFile,
  errors,
  disabled,
  onPurposeChange,
  onRemarksChange,
  onDocumentChange,
}: SpecialPassFieldsProps) {
  const selected = SPECIAL_PASS_PURPOSES.find((p) => p.value === purpose)
  const showDocument = selected?.requiresDocument ?? false
  const showRemarksOnly = purpose === 'other'

  return (
    <div className="space-y-4 rounded-xl border border-[#1A5CA0]/25 bg-[#EBF3FF]/40 p-4">
      <p className="text-sm font-semibold text-[#0D3F72]">Special pass details</p>

      <div className="space-y-2">
        <Label htmlFor="special-purpose">Purpose</Label>
        <select
          id="special-purpose"
          value={purpose ?? ''}
          disabled={disabled}
          onChange={(e) => onPurposeChange(e.target.value as SpecialPassPurpose)}
          className="flex h-10 w-full rounded-xl border border-white/55 bg-white/50 px-3 text-sm text-slate-900 shadow-sm backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <option value="">Select purpose…</option>
          {SPECIAL_PASS_PURPOSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors?.specialPurpose && (
          <p className="text-sm text-[#DC2626]">{errors.specialPurpose}</p>
        )}
      </div>

      {showRemarksOnly && (
        <div className="space-y-2">
          <Label htmlFor="special-remarks">Remarks</Label>
          <textarea
            id="special-remarks"
            rows={3}
            placeholder="Describe the purpose of your special pass"
            value={remarks}
            disabled={disabled}
            onChange={(e) => onRemarksChange(e.target.value)}
            className="flex w-full rounded-xl border border-white/55 bg-white/50 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          {errors?.specialRemarks && (
            <p className="text-sm text-[#DC2626]">{errors.specialRemarks}</p>
          )}
        </div>
      )}

      {showDocument && (
        <div className="space-y-2">
          <Label htmlFor="special-document">Document upload</Label>
          <label
            htmlFor="special-document"
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1A5CA0]/35 bg-white/50 px-4 py-6 text-center transition-colors hover:bg-white/70',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            <Upload className="h-6 w-6 text-[#1A5CA0]" strokeWidth={1.5} />
            <span className="text-sm font-medium text-slate-800">
              {documentFile ? documentFile.name : 'Upload PDF or image'}
            </span>
            <span className="text-xs text-slate-600">PDF, JPG, PNG, WebP · Max 5 MB</span>
          </label>
          <input
            id="special-document"
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
            disabled={disabled}
            className="sr-only"
            onChange={(e) => onDocumentChange(e.target.files?.[0] ?? null)}
          />
          {errors?.documentFile && (
            <p className="text-sm text-[#DC2626]">{errors.documentFile}</p>
          )}
        </div>
      )}
    </div>
  )
}
