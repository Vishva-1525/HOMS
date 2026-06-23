import { ReportsPanel } from '@/components/reports/ReportsPanel'

export function AdminReportsPage() {
  return (
    <ReportsPanel
      title="Reports"
      showBlockFilter
      showDepartmentFilter
      showAggregateTab
    />
  )
}
