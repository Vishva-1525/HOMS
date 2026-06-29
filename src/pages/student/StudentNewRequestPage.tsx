import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthProvider'
import { AcademicCalendarPicker } from '@/components/student/AcademicCalendarPicker'
import { PassTypeSelector } from '@/components/student/PassTypeSelector'
import { SpecialPassFields } from '@/components/student/SpecialPassFields'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAcademicCalendar } from '@/hooks/useAcademicCalendar'
import {
  INITIAL_NEW_REQUEST_FORM,
  getReturnDatetimeBounds,
  isNewRequestFormDirty,
  validateNewRequestForm,
  type NewRequestFormErrors,
  type NewRequestFormValues,
} from '@/lib/outpass-request-validation'
import { supabase } from '@/lib/supabase'
import { uploadSpecialPassDocument } from '@/lib/upload-special-pass-document'

export function StudentNewRequestPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState<NewRequestFormValues>(INITIAL_NEW_REQUEST_FORM)
  const [errors, setErrors] = useState<NewRequestFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const { days, calendarMap, loading: calendarLoading } = useAcademicCalendar()

  const returnBounds = useMemo(
    () => getReturnDatetimeBounds(form.passType, form.departureAt),
    [form.passType, form.departureAt],
  )

  function updateField<K extends keyof NewRequestFormValues>(
    key: K,
    value: NewRequestFormValues[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'passType' && value !== 'special_pass') {
        next.specialPurpose = null
        next.specialRemarks = ''
        next.documentFile = null
      }
      if (Object.keys(errors).length > 0) {
        setErrors(validateNewRequestForm(next, calendarMap))
      }
      return next
    })
  }

  function handleCancel() {
    if (isNewRequestFormDirty(form)) {
      setShowDiscardDialog(true)
    } else {
      navigate('/student/dashboard')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const validationErrors = validateNewRequestForm(form, calendarMap)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    if (!user || !form.passType) return

    setSubmitting(true)
    setErrors({})

    let documentUrl: string | null = null

    if (form.passType === 'special_pass' && form.documentFile) {
      const upload = await uploadSpecialPassDocument(user.id, form.documentFile)
      if (upload.error) {
        setSubmitting(false)
        setErrors({ submit: upload.error })
        return
      }
      documentUrl = upload.path
    }

    const isSpecial = form.passType === 'special_pass'
    const reason =
      isSpecial && form.specialPurpose === 'other'
        ? form.specialRemarks.trim()
        : form.reason.trim()

    const { error } = await supabase.from('outpass_requests').insert({
      student_id: user.id,
      pass_type: form.passType,
      destination: form.destination.trim(),
      reason,
      departure_at: new Date(form.departureAt).toISOString(),
      return_by: new Date(form.returnBy).toISOString(),
      status: 'pending',
      special_purpose: isSpecial ? form.specialPurpose : null,
      special_remarks: isSpecial && form.specialPurpose === 'other' ? form.specialRemarks.trim() : null,
      document_url: documentUrl,
      requires_hod_approval: isSpecial,
    })

    setSubmitting(false)

    if (error) {
      setErrors({ submit: error.message })
      return
    }

    setForm(INITIAL_NEW_REQUEST_FORM)
    setShowSuccess(true)
  }

  if (showSuccess) {
    return (
      <div className="glass-panel-strong mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EBF7EE]">
          <CheckCircle className="h-9 w-9 text-[#2E8B44]" strokeWidth={1.5} />
        </div>
        <h1 className="dashboard-heading mt-5 text-xl font-semibold">Request submitted!</h1>
        <p className="dashboard-subheading mt-2 text-sm">Your warden will review it shortly.</p>
        <Button
          type="button"
          className="mt-8 w-full max-w-xs"
          onClick={() => navigate('/student/passes')}
        >
          Go to my passes
        </Button>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="New outpass request"
        actions={
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="glass-panel space-y-5 p-5 pb-6" noValidate>
        <PassTypeSelector
          value={form.passType}
          onChange={(type) => updateField('passType', type)}
          error={errors.passType}
          disabled={submitting}
        />

        {form.passType === 'special_pass' && (
          <SpecialPassFields
            purpose={form.specialPurpose}
            remarks={form.specialRemarks}
            documentFile={form.documentFile}
            errors={{
              specialPurpose: errors.specialPurpose,
              specialRemarks: errors.specialRemarks,
              documentFile: errors.documentFile,
            }}
            disabled={submitting}
            onPurposeChange={(purpose) => updateField('specialPurpose', purpose)}
            onRemarksChange={(remarks) => updateField('specialRemarks', remarks)}
            onDocumentChange={(file) => updateField('documentFile', file)}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="destination">Destination</Label>
          <Input
            id="destination"
            type="text"
            placeholder="e.g. Chennai, Home"
            required
            value={form.destination}
            onChange={(e) => updateField('destination', e.target.value)}
            disabled={submitting}
          />
          {errors.destination && (
            <p className="text-sm text-[#DC2626]">{errors.destination}</p>
          )}
        </div>

        {form.passType !== 'special_pass' || form.specialPurpose !== 'other' ? (
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <textarea
              id="reason"
              rows={3}
              placeholder="Purpose of visit"
              required
              value={form.reason}
              onChange={(e) => updateField('reason', e.target.value)}
              disabled={submitting}
              className="flex w-full rounded-xl border border-white/55 bg-white/50 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            {errors.reason && <p className="text-sm text-[#DC2626]">{errors.reason}</p>}
          </div>
        ) : null}

        <AcademicCalendarPicker
          days={days}
          calendarMap={calendarMap}
          loading={calendarLoading}
        />

        <div className="space-y-2">
          <Label htmlFor="departure-at">Departure date &amp; time</Label>
          <Input
            id="departure-at"
            type="datetime-local"
            required
            value={form.departureAt}
            onChange={(e) => updateField('departureAt', e.target.value)}
            disabled={submitting}
          />
          {errors.departureAt && (
            <p className="text-sm text-[#DC2626]">{errors.departureAt}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="return-by">Expected return date &amp; time</Label>
          <Input
            id="return-by"
            type="datetime-local"
            required
            min={returnBounds.min}
            max={returnBounds.max}
            value={form.returnBy}
            onChange={(e) => updateField('returnBy', e.target.value)}
            disabled={submitting || !form.passType}
          />
          {errors.returnBy && <p className="text-sm text-[#DC2626]">{errors.returnBy}</p>}
        </div>

        {errors.submit && <p className="text-sm text-[#DC2626]">{errors.submit}</p>}

        <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
          Submit request
        </Button>
      </form>

      <ConfirmModal
        open={showDiscardDialog}
        title="Discard request?"
        description="You have unsaved changes. Are you sure you want to leave without submitting?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        variant="danger"
        onConfirm={() => {
          setShowDiscardDialog(false)
          setForm(INITIAL_NEW_REQUEST_FORM)
          setErrors({})
          navigate('/student/dashboard')
        }}
        onCancel={() => setShowDiscardDialog(false)}
      />
    </>
  )
}
