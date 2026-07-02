import { Pencil, UserX } from 'lucide-react'
import type { AdminStudentRow } from '@/lib/admin-types'
import { cn } from '@/lib/utils'

interface AdminStudentRowActionsProps {
  student: AdminStudentRow
  onEdit: () => void
  onDeactivate: () => void
}

export function AdminStudentRowActions({
  student,
  onEdit,
  onDeactivate,
}: AdminStudentRowActionsProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-end gap-1.5"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="admin-row-action-btn"
        aria-label={`Edit ${student.profiles?.full_name ?? student.reg_number}`}
        onClick={onEdit}
      >
        <Pencil className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className={cn('admin-row-action-btn admin-row-action-btn-danger')}
        aria-label={
          student.is_active
            ? `Deactivate ${student.profiles?.full_name ?? student.reg_number}`
            : `${student.profiles?.full_name ?? student.reg_number} is already inactive`
        }
        title={student.is_active ? 'Deactivate student' : 'Already inactive'}
        disabled={!student.is_active}
        onClick={onDeactivate}
      >
        <UserX className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}
