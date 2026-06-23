import { useCallback, useEffect, useState } from 'react'
import type { AdminStaffRow } from '@/lib/admin-types'
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
    const { data, error: fnError } = await supabase.functions.invoke('admin-create-staff', {
      body: input,
    })

    if (fnError) throw new Error(fnError.message)
    if (data?.error) throw new Error(data.error as string)

    setCreatedCredentials({ email: data.email, password: data.password })
    await fetchStaff()
    return data as { email: string; password: string }
  }

  return {
    wardens,
    guards,
    loading,
    error,
    createStaff,
    createdCredentials,
    clearCredentials: () => setCreatedCredentials(null),
    refetch: fetchStaff,
  }
}
