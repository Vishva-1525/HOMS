import { useMemo } from 'react'
import { useWardenDataContext } from '@/contexts/WardenDataContext'
import { useCountdown } from '@/hooks/useCountdown'
import { formatReturnTime } from '@/lib/outpass'
import {
  getExitTime,
  getStudentName,
  getStudentRoom,
  isOverdueReturn,
  isStudentCurrentlyOut,
} from '@/lib/warden'
import type { OutpassWithStudent } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

function TimeRemaining({ returnBy }: { returnBy: string }) {
  const countdown = useCountdown(returnBy)
  const isPast = new Date(returnBy).getTime() < Date.now()

  return (
    <span className={cn('font-mono text-sm tabular-nums', isPast && 'text-red-600')}>
      {isPast ? `Overdue ${countdown}` : countdown}
    </span>
  )
}

export function StudentsOutPage() {
  const { passes, gateLogs, loading, error } = useWardenDataContext()

  const studentsOut = useMemo(
    () => passes.filter((p) => isStudentCurrentlyOut(p, gateLogs)),
    [passes, gateLogs],
  )

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Spinner label="Loading students out..." />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Students Out</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {studentsOut.length} student{studentsOut.length !== 1 ? 's' : ''} currently outside hostel
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Exit time</th>
                <th className="px-4 py-3">Return by</th>
                <th className="px-4 py-3">Time remaining</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {studentsOut.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No students are currently out.
                  </td>
                </tr>
              ) : (
                studentsOut.map((pass: OutpassWithStudent) => {
                  const overdue = isOverdueReturn(pass, gateLogs)
                  const exitTime = getExitTime(pass.id, gateLogs)

                  return (
                    <tr
                      key={pass.id}
                      className={cn(
                        'border-b last:border-0',
                        overdue ? 'bg-red-50 hover:bg-red-100/80 dark:bg-red-950/30' : 'hover:bg-muted/20',
                      )}
                    >
                      <td className="px-4 py-3 font-medium">
                        {getStudentName(pass.students)}
                      </td>
                      <td className="px-4 py-3">{getStudentRoom(pass.students)}</td>
                      <td className="max-w-[180px] truncate px-4 py-3">{pass.destination}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {exitTime ? formatReturnTime(exitTime) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatReturnTime(pass.return_by)}
                      </td>
                      <td className="px-4 py-3">
                        <TimeRemaining returnBy={pass.return_by} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                            overdue
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
                          )}
                        >
                          {overdue ? 'Overdue' : 'Out'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
