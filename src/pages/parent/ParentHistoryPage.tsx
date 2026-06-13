import { ParentPassTable } from '@/components/parent/ParentPassTable'
import { ParentWardHeader } from '@/components/parent/ParentWardPanels'
import { Spinner } from '@/components/ui/spinner'
import { useParentData } from '@/hooks/parent/useParentData'

export function ParentHistoryPage() {
  const { wards, activeWard, passes, gateLogs, loading, error, selectWard } = useParentData()

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading pass history…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    )
  }

  if (!activeWard) {
    return (
      <div className="glass-panel-strong p-6">
        <h1 className="dashboard-heading text-xl font-semibold">Pass History</h1>
        <p className="dashboard-subheading mt-2 text-sm">
          No ward linked to your account. Contact the warden office to register your parent contact
          details.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-page-header">
        <h1 className="dashboard-heading text-xl md:text-2xl">Pass History</h1>
        <p className="dashboard-subheading mt-1.5 text-sm">
          Complete outpass history with gate exit and entry times, sorted newest first
        </p>
      </div>

      <ParentWardHeader ward={activeWard} wards={wards} onSelectWard={selectWard} />

      <ParentPassTable
        passes={passes}
        gateLogs={gateLogs}
        title={`All passes (${passes.length})`}
        emptyMessage="Your ward has not requested any outpasses yet."
      />
    </div>
  )
}
