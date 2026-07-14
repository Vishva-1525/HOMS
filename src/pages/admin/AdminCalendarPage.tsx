import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { AcademicCalendarPicker } from '@/components/student/AcademicCalendarPicker'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { useAdminCalendar } from '@/hooks/admin/useAdminCalendar'
import {
  ACADEMIC_DAY_LABELS,
  ACADEMIC_DAY_STYLES,
  parseDateKey,
  toDateKey,
} from '@/lib/academic-calendar'
import type { AcademicCalendarDay, AcademicDayType } from '@/lib/types'
import { cn } from '@/lib/utils'

const DAY_TYPES: AcademicDayType[] = [
  'holiday',
  'working_day',
  'study_holiday',
  'exam_day',
]

const TYPE_FILTER_OPTIONS: { id: AcademicDayType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'holiday', label: 'Holidays' },
  { id: 'working_day', label: 'Working Days' },
  { id: 'study_holiday', label: 'Study Holidays' },
  { id: 'exam_day', label: 'Exam Holidays' },
]

const EMPTY_FORM: AcademicCalendarDay = {
  calendar_date: '',
  day_type: 'holiday',
  label: '',
}

function resolveDayType(
  dateKey: string,
  calendarMap: Map<string, AcademicCalendarDay>,
): AcademicDayType {
  const entry = calendarMap.get(dateKey)
  if (entry) return entry.day_type
  const dow = parseDateKey(dateKey).getDay()
  return dow === 0 || dow === 6 ? 'holiday' : 'working_day'
}

export function AdminCalendarPage() {
  const {
    days,
    allDays,
    calendarMap,
    loading,
    error,
    typeFilter,
    setTypeFilter,
    upsertDay,
    deleteDay,
  } = useAdminCalendar()
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<AcademicCalendarDay>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleteDate, setDeleteDate] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()))

  const editing = useMemo(
    () => Boolean(form.calendar_date && allDays.some((d) => d.calendar_date === form.calendar_date)),
    [form.calendar_date, allDays],
  )

  const selectedMeta = useMemo(() => {
    const entry = calendarMap.get(selectedDateKey)
    const dayType = resolveDayType(selectedDateKey, calendarMap)
    const date = parseDateKey(selectedDateKey)
    return {
      dayType,
      label: entry?.label?.trim() || ACADEMIC_DAY_LABELS[dayType],
      formatted: date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      isToday: selectedDateKey === toDateKey(new Date()),
      hasEntry: Boolean(entry),
    }
  }, [calendarMap, selectedDateKey])

  function openCreate(dateKey?: string) {
    setForm({
      ...EMPTY_FORM,
      calendar_date: dateKey ?? '',
    })
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(day: AcademicCalendarDay) {
    setForm(day)
    setFormError(null)
    setFormOpen(true)
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDateKey(dateKey)
  }

  async function handleSave() {
    if (!form.calendar_date) {
      setFormError('Date is required.')
      return
    }
    if (!form.label.trim()) {
      setFormError('Label is required.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      await upsertDay({
        calendar_date: form.calendar_date,
        day_type: form.day_type,
        label: form.label.trim(),
      })
      setFormOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteDate) return
    setSubmitting(true)
    try {
      await deleteDay(deleteDate)
      setDeleteDate(null)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading calendar…" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="dashboard-page-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="dashboard-heading text-2xl md:text-3xl">Holiday management</h1>
          <p className="dashboard-subheading mt-1.5 text-sm sm:text-[15px]">
            Manage holidays, working days, study holidays, and exam days
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => openCreate()}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add entry
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="dashboard-section">
        <h2 className="dashboard-section-heading">
          <span className="dashboard-section-accent" aria-hidden />
          Academic calendar
        </h2>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <AcademicCalendarPicker
            days={allDays}
            calendarMap={calendarMap}
            selectedDateKey={selectedDateKey}
            onSelectDate={handleSelectDate}
            mode="browse"
            title="Month view"
            helperText="Today has a blue ring and marker. Selected dates use the primary highlight. Tap a date to add or edit an entry."
          />
          <div
            className={cn(
              'flex flex-col justify-between gap-4 rounded-2xl border px-4 py-4 shadow-sm sm:px-5',
              ACADEMIC_DAY_STYLES[selectedMeta.dayType],
            )}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                {selectedMeta.isToday ? 'Today' : 'Selected date'}
              </p>
              <p className="mt-1 text-lg font-bold tracking-tight sm:text-xl">
                {selectedMeta.formatted}
              </p>
              <p className="mt-1 text-sm font-medium opacity-90">{selectedMeta.label}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-current/20 bg-white/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide dark:bg-black/20">
                {ACADEMIC_DAY_LABELS[selectedMeta.dayType]}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const existing = calendarMap.get(selectedDateKey)
                  if (existing) openEdit(existing)
                  else openCreate(selectedDateKey)
                }}
              >
                {selectedMeta.hasEntry ? 'Edit entry' : 'Add entry'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-section space-y-4">
        <h2 className="dashboard-section-heading">
          <span className="dashboard-section-accent" aria-hidden />
          Calendar entries
        </h2>

        <div className="flex flex-wrap gap-2">
          {TYPE_FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTypeFilter(option.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                typeFilter === option.id
                  ? 'bg-[#1A5CA0] text-white shadow-sm'
                  : 'bg-white/70 text-slate-800 hover:bg-white',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="dashboard-surface overflow-hidden">
          <DataTable
            data={days}
            getRowKey={(row) => row.calendar_date}
            emptyMessage="No calendar entries match this filter."
            columns={[
              {
                header: 'Date',
                accessor: 'calendar_date',
                render: (row) =>
                  new Date(row.calendar_date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
              },
              {
                header: 'Type',
                accessor: 'day_type',
                render: (row) => (
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                      ACADEMIC_DAY_STYLES[row.day_type],
                    )}
                  >
                    {ACADEMIC_DAY_LABELS[row.day_type]}
                  </span>
                ),
              },
              { header: 'Label', accessor: 'label' },
              {
                header: 'Actions',
                accessor: 'calendar_date',
                render: (row) => (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-[#DC2626] hover:bg-red-50"
                      aria-label="Delete"
                      onClick={() => setDeleteDate(row.calendar_date)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </section>

      <Modal
        open={formOpen}
        title={editing ? 'Edit calendar entry' : 'Add calendar entry'}
        onClose={() => setFormOpen(false)}
        footer={
          <ModalFooter
            onCancel={() => setFormOpen(false)}
            onConfirm={handleSave}
            confirmLabel={editing ? 'Save changes' : 'Add entry'}
            loading={submitting}
          />
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="cal-date">Date</Label>
            <Input
              id="cal-date"
              type="date"
              value={form.calendar_date}
              disabled={editing}
              onChange={(e) => setForm((prev) => ({ ...prev, calendar_date: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cal-type">Type</Label>
            <select
              id="cal-type"
              value={form.day_type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  day_type: e.target.value as AcademicDayType,
                }))
              }
              className="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm font-medium"
            >
              {DAY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ACADEMIC_DAY_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="cal-label">Label</Label>
            <Input
              id="cal-label"
              value={form.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="e.g. Pongal holiday"
              className="mt-1"
            />
          </div>
          {formError && <p className="text-sm text-[#DC2626]">{formError}</p>}
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteDate)}
        title="Delete calendar entry?"
        description="Students will no longer see this date marked on the academic calendar."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDate(null)}
      />
    </div>
  )
}
