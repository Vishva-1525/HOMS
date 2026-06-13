import { supabase } from '@/lib/supabase'
import { fetchAdmissionNoByStudentId } from '@/lib/student-details'
import type { Student } from '@/lib/types'

export interface ParentWard {
  student: Student
  profile: { full_name: string; phone: string } | null
  admissionNo?: string
}

export async function fetchParentWards(): Promise<{
  wards: ParentWard[]
  error: string | null
}> {
  const { data: students, error } = await supabase.from('students').select('*')

  if (error) {
    return { wards: [], error: error.message }
  }

  const rows = (students ?? []) as Student[]
  if (rows.length === 0) {
    return { wards: [], error: null }
  }

  const studentIds = rows.map((s) => s.id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', studentIds)

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  const wards = await Promise.all(
    rows.map(async (student) => {
      const profile = profileById.get(student.id) ?? null
      const admissionNo = await fetchAdmissionNoByStudentId(student.id, student.reg_number)

      return {
        student,
        profile: profile
          ? { full_name: profile.full_name, phone: profile.phone }
          : null,
        admissionNo,
      }
    }),
  )

  return { wards, error: null }
}
