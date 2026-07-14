import { useEffect, useMemo, useState } from 'react'
import { PassDetailSheet } from '@/components/student/PassDetailSheet'
import { PassFilterChips } from '@/components/student/PassFilterChips'
import { PassListCard } from '@/components/student/PassListCard'
import { PassQrSheet } from '@/components/student/PassQrSheet'
import { DashboardErrorPanel } from '@/components/ui/DashboardErrorPanel'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/spinner'
import { useStudentDataContext } from '@/contexts/StudentDataContext'
import { filterPasses, isQrEligibleStatus, type PassFilter } from '@/lib/pass-filters'
import type { OutpassRequest } from '@/lib/types'

export function StudentPassesPage() {
  const {
    passes,
    gateLogs,
    extensions,
    student,
    quotas,
    loading,
    error,
    refetch,
  } = useStudentDataContext()
  const [filter, setFilter] = useState<PassFilter>('all')
  const [selectedPass, setSelectedPass] = useState<OutpassRequest | null>(null)
  const [qrPass, setQrPass] = useState<OutpassRequest | null>(null)
  const [retrying, setRetrying] = useState(false)

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

  async function handleRetry() {
    setRetrying(true)
    try {
      await refetch()
    } finally {
      setRetrying(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading passes…" />
      </div>
    )
  }

  if (error && passes.length === 0) {
    return (
      <DashboardErrorPanel
        error={error}
        onRetry={handleRetry}
        retrying={retrying}
        title="Couldn’t load your passes"
      />
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
        onUpdated={() => {
          void refetch()
        }}
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
