import { useEffect, useState } from 'react'
import { ReportsPanel } from '@/components/reports/ReportsPanel'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthProvider'
import { fetchWardenAssignment } from '@/hooks/useReportData'
import { formatBlockLabel } from '@/lib/block-display'

export function ReportsPage() {
  const { user } = useAuth()
  const [block, setBlock] = useState<string | null>(null)
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    void (async () => {
      setLoading(true)
      try {
        const assigned = await fetchWardenAssignment(user.id)
        setBlock(assigned?.block ?? null)
        setGender(assigned?.gender ?? null)
        if (!assigned?.block || !assigned.gender) {
          setError('No hostel block/gender assigned to your account. Contact the administrator.')
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

  if (error || !block || !gender) {
    return (
      <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
        {error ?? 'Block assignment not found.'}
      </div>
    )
  }

  return (
    <ReportsPanel
      title={`Reports — ${formatBlockLabel(block)} (${gender})`}
      fixedHostelBlock={block}
      fixedGender={gender}
    />
  )
}
