import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import { fetchWardenAssignment } from '@/hooks/useReportData'
import type { WardenScope } from '@/lib/warden-scope'

export function useWardenScope() {
  const { user } = useAuth()
  const [scope, setScope] = useState<WardenScope | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setScope(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchWardenAssignment(user.id).then((assignment) => {
      if (cancelled) return
      if (!assignment?.block || !assignment.gender) {
        setScope(null)
        setError('No hostel block or gender is assigned to your account. Contact the administrator.')
      } else {
        setScope({ block: assignment.block, gender: assignment.gender })
        setError(null)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  return { scope, loading, error }
}
