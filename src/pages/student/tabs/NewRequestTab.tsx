import { useState, type FormEvent } from 'react'
import { IconCircleCheck } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthProvider'
import { PassTypeSelector } from '@/components/student/PassTypeSelector'
import type { StudentTab } from '@/components/student/StudentBottomNav'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  INITIAL_NEW_REQUEST_FORM,
  isNewRequestFormDirty,
  validateNewRequestForm,
  type NewRequestFormErrors,
  type NewRequestFormValues,
} from '@/lib/outpass-request-validation'
import { supabase } from '@/lib/supabase'

interface NewRequestTabProps {
  onTabChange: (tab: StudentTab) => void
}

export function NewRequestTab({ onTabChange }: NewRequestTabProps) {
  const { user } = useAuth()
  const [form, setForm] = useState<NewRequestFormValues>(INITIAL_NEW_REQUEST_FORM)
  const [errors, setErrors] = useState<NewRequestFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  function updateField<K extends keyof NewRequestFormValues>(
    key: K,
    value: NewRequestFormValues[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (Object.keys(errors).length > 0) {
        setErrors(validateNewRequestForm(next))
      }
      return next
    })
  }

  function handleCancel() {
    if (isNewRequestFormDirty(form)) {
      setShowDiscardDialog(true)
    } else {
      onTabChange('home')
    }
  }

  function discardAndLeave() {
    setShowDiscardDialog(false)
    setForm(INITIAL_NEW_REQUEST_FORM)
    setErrors({})
    onTabChange('home')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const validationErrors = validateNewRequestForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    if (!user || !form.passType) return

    setSubmitting(true)
    setErrors({})

    const { error } = await supabase.from('outpass_requests').insert({
      student_id: user.id,
      pass_type: form.passType,
      destination: form.destination.trim(),
      reason: form.reason.trim(),
      departure_at: new Date(form.departureAt).toISOString(),
      return_by: new Date(form.returnBy).toISOString(),
      status: 'pending',
    })

    setSubmitting(false)

    if (error) {
      setErrors({ submit: error.message })
      return
    }

    setForm(INITIAL_NEW_REQUEST_FORM)
    setShowSuccess(true)
  }

  function handleViewStatus() {
    setShowSuccess(false)
    onTabChange('my-passes')
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold">New Request</h1>
        <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-4" noValidate>
        <PassTypeSelector
          value={form.passType}
          onChange={(type) => updateField('passType', type)}
          error={errors.passType}
          disabled={submitting}
        />

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
            aria-invalid={!!errors.destination}
          />
          <FieldError message={errors.destination} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Input
            id="reason"
            type="text"
            placeholder="Purpose of visit"
            required
            value={form.reason}
            onChange={(e) => updateField('reason', e.target.value)}
            disabled={submitting}
            aria-invalid={!!errors.reason}
          />
          <FieldError message={errors.reason} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="departure-at">Departure Date &amp; Time</Label>
          <Input
            id="departure-at"
            type="datetime-local"
            required
            value={form.departureAt}
            onChange={(e) => updateField('departureAt', e.target.value)}
            disabled={submitting}
            aria-invalid={!!errors.departureAt}
          />
          <FieldError message={errors.departureAt} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="return-by">Return Date &amp; Time</Label>
          <Input
            id="return-by"
            type="datetime-local"
            required
            value={form.returnBy}
            onChange={(e) => updateField('returnBy', e.target.value)}
            disabled={submitting}
            aria-invalid={!!errors.returnBy}
          />
          <FieldError message={errors.returnBy} />
        </div>

        <FieldError message={errors.submit} />

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Request'}
        </Button>
      </form>

      <ConfirmDialog
        open={showDiscardDialog}
        title="Discard request?"
        description="You have unsaved changes. Are you sure you want to leave without submitting?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={discardAndLeave}
        onCancel={() => setShowDiscardDialog(false)}
      />

      <BottomSheet
        open={showSuccess}
        title="Request submitted!"
        description="Your warden will review it shortly."
        actionLabel="View status"
        onAction={handleViewStatus}
      >
        <div className="mt-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <IconCircleCheck className="h-8 w-8 text-green-600 dark:text-green-400" stroke={1.5} />
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
