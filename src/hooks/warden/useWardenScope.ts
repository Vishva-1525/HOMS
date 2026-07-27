import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import { fetchWardenAssignment } from '@/hooks/useReportData'
import { supabase } from '@/lib/supabase'
import type { WardenScope } from '@/lib/warden-scope'

export function useWardenScope() {
  const { user } = useAuth()
  const [scope, setScope] = useState<WardenScope | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user?.id) {
      setScope(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const assignment = await fetchWardenAssignment(user.id)
    if (!assignment?.gender) {
      setScope(null)
      setError('No gender is assigned to your account. Contact the administrator.')
      setLoading(false)
      return
    }

    if (assignment.tier === 'rt' && !assignment.block) {
      setScope(null)
      setError('No hostel block is assigned to your account. Contact the administrator.')
      setLoading(false)
      return
    }

    setScope({
      tier: assignment.tier,
      block: assignment.block,
      gender: assignment.gender,
      isAvailable: assignment.isAvailable,
      unavailableReason: assignment.unavailableReason,
      escalatedBlocks: assignment.escalatedBlocks,
      canApprove: assignment.tier === 'superior' || assignment.isAvailable,
    })
    setError(null)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void reload()
  }, [reload])

  const setAvailability = useCallback(
    async (isAvailable: boolean, reason?: string) => {
      const { data, error: rpcError } = await supabase.rpc('set_warden_availability', {
        p_is_available: isAvailable,
        p_reason: reason ?? null,
      })
      if (rpcError) {
        return { error: rpcError.message }
      }
      await reload()
      return { error: null as string | null, data }
    },
    [reload],
  )

  return { scope, loading, error, refetch: reload, setAvailability }
}
