import { useEffect, useMemo, useState } from 'react'
import { PassDetailSheet } from '@/components/student/PassDetailSheet'
import { PassFilterChips } from '@/components/student/PassFilterChips'
import { PassListCard } from '@/components/student/PassListCard'
import { PassQrSheet } from '@/components/student/PassQrSheet'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/spinner'
import { useStudentPasses } from '@/hooks/useStudentPasses'
import { filterPasses, isQrEligibleStatus, type PassFilter } from '@/lib/pass-filters'
import type { OutpassRequest } from '@/lib/types'

export function StudentPassesPage() {
  const { passes, gateLogs, extensions, student, loading, error, refetch } = useStudentPasses()
  const [filter, setFilter] = useState<PassFilter>('all')
  const [selectedPass, setSelectedPass] = useState<OutpassRequest | null>(null)
  const [qrPass, setQrPass] = useState<OutpassRequest | null>(null)

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
        <Spinner label="Loading passes…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
        {error}
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="My passes"
        subtitle={`${passes.length} request${passes.length !== 1 ? 's' : ''} total`}
      />

      <PassFilterChips value={filter} onChange={setFilter} />

      <div className="mt-4 space-y-3">
        {filteredPasses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300/80 bg-white/75 p-8 text-center text-sm text-slate-700 backdrop-blur-sm">
            No passes match this filter.
          </div>
        ) : (
          filteredPasses.map((pass) => (
            <PassListCard
              key={pass.id}
              pass={pass}
              gateLogs={gateLogs}
              onClick={() => setSelectedPass(pass)}
              onViewQr={
                isQrEligibleStatus(pass.status)
                  ? () => setQrPass(pass)
                  : undefined
              }
            />
          ))
        )}
      </div>

      <PassDetailSheet
        pass={selectedPass}
        student={student}
        extensions={extensions}
        gateLogs={gateLogs}
        onClose={() => setSelectedPass(null)}
        onUpdated={refetch}
      />

      {student && qrPass && (
        <PassQrSheet
          open={Boolean(qrPass)}
          pass={qrPass}
          regNumber={student.reg_number}
          onClose={() => setQrPass(null)}
        />
      )}
    </>
  )
}
