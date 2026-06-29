import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { fetchDistinctBlocks } from '@/hooks/useReportData'
import { formatBlockLabel } from '@/lib/block-display'
import type { AdminStaffRow } from '@/lib/admin-types'

interface AdminStaffEditDrawerProps {
  open: boolean
  staff: AdminStaffRow | null
  role: 'warden' | 'security_guard'
  onClose: () => void
  onSave: (profileId: string, assignmentValue: string) => Promise<void>
}

export function AdminStaffEditDrawer({
  open,
  staff,
  role,
  onClose,
  onSave,
}: AdminStaffEditDrawerProps) {
  const [assignment, setAssignment] = useState('')
  const [blockOptions, setBlockOptions] = useState<string[]>([])
  const [loadingBlocks, setLoadingBlocks] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isWarden = role === 'warden'
  const assignmentLabel = isWarden ? 'Hostel block' : 'Gate assigned'

  useEffect(() => {
    if (!open || !isWarden) return
    setLoadingBlocks(true)
    void fetchDistinctBlocks()
      .then(setBlockOptions)
      .finally(() => setLoadingBlocks(false))
  }, [open, isWarden])

  useEffect(() => {
    if (!open || !staff) return
    setAssignment(staff.assignment_value?.trim() ?? '')
    setError(null)
  }, [open, staff])

  if (!open || !staff) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assignment.trim()) {
      setError(isWarden ? 'Select or enter a block number.' : 'Enter a gate name.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(staff!.id, assignment.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assignment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <aside className="dashboard-surface relative z-10 flex h-full w-full max-w-[400px] flex-col rounded-none shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
          <div>
            <h2 className="dashboard-heading text-lg font-semibold">Edit assignment</h2>
            <p className="dashboard-muted mt-0.5 text-sm">{staff.full_name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm">
              <p className="text-slate-500">Email</p>
              <p className="font-medium text-slate-900">{staff.email}</p>
            </div>

            <div>
              <Label htmlFor="staff-edit-assignment">{assignmentLabel}</Label>
              {isWarden ? (
                <div className="mt-1 space-y-2">
                  {loadingBlocks ? (
                    <div className="flex h-10 items-center">
                      <Spinner label="Loading blocks…" />
                    </div>
                  ) : (
                    <select
                      id="staff-edit-assignment"
                      value={assignment}
                      onChange={(e) => setAssignment(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="">Select block…</option>
                      {blockOptions.map((block) => (
                        <option key={block} value={block}>
                          {formatBlockLabel(block)}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-slate-500">
                    Or enter block number manually (must match student records exactly).
                  </p>
                  <Input
                    value={assignment}
                    onChange={(e) => setAssignment(e.target.value)}
                    placeholder="e.g. 1"
                    inputMode="numeric"
                  />
                </div>
              ) : (
                <Input
                  id="staff-edit-assignment"
                  className="mt-1"
                  value={assignment}
                  onChange={(e) => setAssignment(e.target.value)}
                  placeholder="e.g. Main Gate"
                />
              )}
              {isWarden && assignment && (
                <p className="mt-2 text-xs font-medium text-[#1A5CA0]">
                  Reports will filter: {formatBlockLabel(assignment)}
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>

          <div className="border-t border-slate-200/80 p-4">
            <Button type="submit" className="w-full" loading={saving}>
              Save assignment
            </Button>
          </div>
        </form>
      </aside>
    </div>
  )
}
