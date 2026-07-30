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
  const [tier, setTier] = useState<'rt' | 'superior'>('rt')
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
        setTier(assigned?.tier ?? 'rt')
        if (!assigned?.gender) {
          setError('No gender assigned to your account. Contact the administrator.')
        } else if (assigned.tier === 'rt' && !assigned.block) {
          setError('No hostel block assigned to your account. Contact the administrator.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assignment')
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

  if (error || !gender || (tier === 'rt' && !block)) {
    return (
      <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
        {error ?? 'Assignment not found.'}
      </div>
    )
  }

  if (tier === 'superior') {
    return (
      <ReportsPanel
        title={`Warden reports - all ${gender} blocks`}
        fixedHostelBlock={null}
        fixedGender={gender}
      />
    )
  }

  return (
    <ReportsPanel
      title={`RT reports - ${formatBlockLabel(block!)} (${gender})`}
      fixedHostelBlock={block}
      fixedGender={gender}
    />
  )
}
