import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PASS_TYPE_LABELS } from '@/lib/outpass'
import { getPassDisplayStatus, getPassStatusLabel } from '@/lib/pass-status'
import type { AdminStudentRow } from '@/lib/admin-types'
import type { GateLog, OutpassRequest } from '@/lib/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'

interface AdminStudentDrawerProps {
  student: AdminStudentRow | null
  passes: OutpassRequest[]
  gateLogs: GateLog[]
  onClose: () => void
  onDeactivate: (id: string) => Promise<void>
  onSave: (id: string, patch: { full_name?: string; phone?: string; room_number?: string; hostel_block?: string }) => Promise<void>
}

export function AdminStudentDrawer({
  student,
  passes,
  gateLogs,
  onClose,
  onDeactivate,
  onSave,
}: AdminStudentDrawerProps) {
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [room, setRoom] = useState('')
  const [block, setBlock] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!student) return null

  const recentPasses = passes.slice(0, 5)
  const campusBadge =
    student.campus_status === 'outside'
      ? { label: 'Outside', className: 'bg-blue-100 text-blue-800' }
      : student.campus_status === 'overdue'
        ? { label: 'Overdue', className: 'bg-red-100 text-red-800' }
        : { label: 'Inside', className: 'bg-emerald-100 text-emerald-800' }

  function startEdit() {
    setFullName(student!.profiles?.full_name ?? '')
    setPhone(student!.profiles?.phone ?? '')
    setRoom(student!.room_number)
    setBlock(student!.hostel_block)
    setEditing(true)
  }

  async function handleSave() {
    setSubmitting(true)
    try {
      await onSave(student!.id, {
        full_name: fullName,
        phone,
        room_number: room,
        hostel_block: block,
      })
      setEditing(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[400px] flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Student details</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', campusBadge.className)}>
              {campusBadge.label}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                student.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600',
              )}
            >
              {student.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="edit-name">Full name</Label>
                <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-room">Room</Label>
                <Input id="edit-room" value={room} onChange={(e) => setRoom(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-block">Block</Label>
                <Input id="edit-block" value={block} onChange={(e) => setBlock(e.target.value)} />
              </div>
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              <Row label="Name" value={student.profiles?.full_name ?? '—'} />
              <Row label="Reg no" value={student.reg_number} />
              <Row label="Room" value={`${student.room_number} · ${student.hostel_block}`} />
              <Row label="Department" value={student.department} />
              <Row label="Year" value={String(student.year_of_study)} />
              <Row label="Parent phone" value={student.parent_phone || '—'} />
              <Row label="Parent email" value={student.parent_email || '—'} />
            </dl>
          )}

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Pass history</p>
            <p className="mt-1 text-sm text-slate-700">{passes.length} total passes</p>
            <ul className="mt-3 space-y-2">
              {recentPasses.map((pass) => (
                <li key={pass.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-800">
                    {PASS_TYPE_LABELS[pass.pass_type]} · {pass.destination}
                  </span>
                  <StatusBadge
                    status={getPassDisplayStatus(pass, gateLogs)}
                    label={getPassStatusLabel(pass.status, gateLogs, pass)}
                  />
                </li>
              ))}
              {recentPasses.length === 0 && (
                <li className="text-sm text-slate-500">No passes yet</li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t p-4 space-y-2">
          {editing ? (
            <>
              <Button type="button" className="w-full" loading={submitting} onClick={handleSave}>
                Save changes
              </Button>
              <Button type="button" variant="secondary" className="w-full" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button type="button" className="w-full" onClick={startEdit}>
                Edit student
              </Button>
              {student.is_active && (
                <Button
                  type="button"
                  variant="danger"
                  className="w-full"
                  loading={submitting}
                  onClick={async () => {
                    setSubmitting(true)
                    try {
                      await onDeactivate(student.id)
                      onClose()
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                >
                  Deactivate account
                </Button>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}
