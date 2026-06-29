import { useCallback, useEffect, useState } from 'react'
import type { AdminStaffRow } from '@/lib/admin-types'
import { normalizeBlockValue } from '@/lib/block-display'
import { supabase } from '@/lib/supabase'

export function useAdminStaff() {
  const [wardens, setWardens] = useState<AdminStaffRow[]>([])
  const [guards, setGuards] = useState<AdminStaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string
    password: string
  } | null>(null)

  const fetchStaff = useCallback(async () => {
    setError(null)
    const [wardenResult, guardResult] = await Promise.all([
      supabase.rpc('get_admin_staff_list', { p_role: 'warden' }),
      supabase.rpc('get_admin_staff_list', { p_role: 'security_guard' }),
    ])

    if (wardenResult.error) {
      setError(wardenResult.error.message)
    } else {
      setWardens((wardenResult.data as AdminStaffRow[]) ?? [])
    }

    if (guardResult.error) {
      setError(guardResult.error.message)
    } else {
      setGuards((guardResult.data as AdminStaffRow[]) ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchStaff()
  }, [fetchStaff])

  async function createStaff(input: {
    full_name: string
    email: string
    phone: string
    role: 'warden' | 'security_guard'
    assignment_value: string
  }) {
    const normalizedInput = {
      ...input,
      assignment_value:
        input.role === 'warden'
          ? normalizeBlockValue(input.assignment_value)
          : input.assignment_value.trim(),
    }

    const { data, error: fnError } = await supabase.functions.invoke('admin-create-staff', {
      body: normalizedInput,
    })

    if (fnError) throw new Error(fnError.message)
    if (data?.error) throw new Error(data.error as string)

    setCreatedCredentials({ email: data.email, password: data.password })
    await fetchStaff()
    return data as { email: string; password: string }
  }

  async function updateStaffAssignment(
    profileId: string,
    role: 'warden' | 'security_guard',
    assignmentValue: string,
  ) {
    const assignmentType = role === 'warden' ? 'block' : 'gate'
    const normalized =
      role === 'warden' ? normalizeBlockValue(assignmentValue) : assignmentValue.trim()

    if (!normalized) {
      throw new Error('Assignment value is required')
    }

    const { error: upsertError } = await supabase.from('staff_assignments').upsert(
      {
        profile_id: profileId,
        assignment_type: assignmentType,
        assignment_value: normalized,
      },
      { onConflict: 'profile_id,assignment_type' },
    )

    if (upsertError) throw new Error(upsertError.message)
    await fetchStaff()
  }

  return {
    wardens,
    guards,
    loading,
    error,
    createStaff,
    updateStaffAssignment,
    createdCredentials,
    clearCredentials: () => setCreatedCredentials(null),
    refetch: fetchStaff,
  }
}
