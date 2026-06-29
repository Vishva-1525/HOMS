import { useEffect, useMemo, useState } from 'react'
import { PassDetailSheet } from '@/components/student/PassDetailSheet'
import { PassFilterChips } from '@/components/student/PassFilterChips'
import { PassListCard } from '@/components/student/PassListCard'
import { PassQrSheet } from '@/components/student/PassQrSheet'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/spinner'
import { useStudentPasses } from '@/hooks/useStudentPasses'
import { useStudentPassQuotas } from '@/hooks/useStudentPassQuotas'
import { filterPasses, isQrEligibleStatus, type PassFilter } from '@/lib/pass-filters'
import type { OutpassRequest } from '@/lib/types'

export function StudentPassesPage() {
  const { passes, gateLogs, extensions, student, loading, error, refetch } = useStudentPasses()
  const { quotas } = useStudentPassQuotas()
  const [filter, setFilter] = useState<PassFilter>('all')
  const [selectedPass, setSelectedPass] = useState<OutpassRequest | null>(null)
  const [qrPass, setQrPass] = useState<OutpassRequest | null>(null)

  const approvedPasses = useMemo(
    () => passes.filter((pass) => pass.status === 'approved' || pass.status === 'extended'),
    [passes],
  )

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
      <div className="dashboard-loading-panel">
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
          <div className="glass-panel border-dashed p-8 text-center text-sm text-slate-700">
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
        quotas={quotas}
        approvedPasses={approvedPasses}
        onClose={() => setSelectedPass(null)}
        onUpdated={refetch}
      />

      {qrPass && (
        <PassQrSheet
          open={Boolean(qrPass)}
          pass={qrPass}
          quotas={quotas}
          approvedPasses={approvedPasses}
          onClose={() => setQrPass(null)}
        />
      )}
    </>
  )
}
