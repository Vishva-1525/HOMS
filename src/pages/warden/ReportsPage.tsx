import { useEffect, useState } from 'react'
import { ReportsPanel } from '@/components/reports/ReportsPanel'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthProvider'
import { fetchWardenBlockAssignment } from '@/hooks/useReportData'

export function ReportsPage() {
  const { user } = useAuth()
  const [block, setBlock] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    void (async () => {
      setLoading(true)
      try {
        const assigned = await fetchWardenBlockAssignment(user.id)
        setBlock(assigned)
        if (!assigned) {
          setError('No hostel block assigned to your account. Contact the administrator.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load block assignment')
      } finally {
        setLoading(false)
      }
    })()
  }, [user?.id])

  if (loading) {
    return (
      <div className="dashboard-loading-panel">
        <Spinner label="Loading reports…" />
      </div>
    )
  }

  if (error || !block) {
    return (
      <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
        {error ?? 'Block assignment not found.'}
      </div>
    )
  }

  return <ReportsPanel title={`Reports — Block ${block}`} fixedHostelBlock={block} />
}
