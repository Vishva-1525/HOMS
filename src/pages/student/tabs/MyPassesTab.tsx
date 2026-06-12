import { useEffect, useMemo, useState } from 'react'
import { PassDetailSheet } from '@/components/student/PassDetailSheet'
import { PassFilterChips } from '@/components/student/PassFilterChips'
import { PassListCard } from '@/components/student/PassListCard'
import { Spinner } from '@/components/ui/spinner'
import { useStudentPasses } from '@/hooks/useStudentPasses'
import { filterPasses, type PassFilter } from '@/lib/pass-filters'
import type { OutpassRequest } from '@/lib/types'

export function MyPassesTab() {
  const { passes, gateLogs, extensions, student, loading, error, refetch } = useStudentPasses()
  const [filter, setFilter] = useState<PassFilter>('all')
  const [selectedPass, setSelectedPass] = useState<OutpassRequest | null>(null)

  const filteredPasses = useMemo(
    () => filterPasses(passes, filter, gateLogs),
    [passes, filter, gateLogs],
  )

  useEffect(() => {
    if (!selectedPass) return
    const updated = passes.find((p) => p.id === selectedPass.id)
    if (updated) setSelectedPass(updated)
  }, [passes, selectedPass])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading passes..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">My Passes</h1>
        <p className="text-sm text-muted-foreground">
          {passes.length} request{passes.length !== 1 ? 's' : ''} total
        </p>
      </div>

      <PassFilterChips value={filter} onChange={setFilter} />

      <div className="mt-4 space-y-3">
        {filteredPasses.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            No passes match this filter.
          </div>
        ) : (
          filteredPasses.map((pass) => (
            <PassListCard
              key={pass.id}
              pass={pass}
              gateLogs={gateLogs}
              onClick={() => setSelectedPass(pass)}
            />
          ))
        )}
      </div>

      <PassDetailSheet
        pass={selectedPass}
        student={student}
        extensions={extensions}
        onClose={() => setSelectedPass(null)}
        onUpdated={refetch}
      />
    </>
  )
}
