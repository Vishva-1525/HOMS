import { supabase } from '@/lib/supabase'
import { getStudentAdmissionNo } from '@/lib/warden'
import type { StudentProfile } from '@/lib/types'

export async function fetchStudentProfileById(
  studentId: string,
): Promise<StudentProfile | null> {
  const [studentResult, profileResult] = await Promise.all([
    supabase
      .from('students')
      .select('id, reg_number, room_number, hostel_block')
      .eq('id', studentId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', studentId)
      .maybeSingle(),
  ])

  const student = studentResult.data
  const profile = profileResult.data

  if (!student && !profile) return null

  return {
    id: studentId,
    reg_number: student?.reg_number ?? '',
    room_number: student?.room_number ?? '',
    hostel_block: student?.hostel_block ?? '',
    profiles: profile
      ? { full_name: profile.full_name, phone: profile.phone }
      : null,
  }
}

export async function fetchAdmissionNoByStudentId(
  studentId: string,
  regNumber?: string,
): Promise<string | undefined> {
  const { data, error } = await supabase.rpc('get_student_admission_no', {
    p_student_id: studentId,
  })

  if (!error && typeof data === 'string' && data.trim()) {
    return data.trim()
  }

  if (regNumber?.trim()) {
    const { data: email, error: emailError } = await supabase.rpc(
      'get_student_login_email',
      { reg_number_input: regNumber },
    )
    if (!emailError && typeof email === 'string') {
      return getStudentAdmissionNo(email)
    }
  }

  return undefined
}

export async function fetchStudentProfilesByIds(
  studentIds: string[],
): Promise<Map<string, StudentProfile>> {
  const uniqueIds = [...new Set(studentIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map()

  const [studentsResult, profilesResult] = await Promise.all([
    supabase
      .from('students')
      .select('id, reg_number, room_number, hostel_block')
      .in('id', uniqueIds),
    supabase.from('profiles').select('id, full_name, phone').in('id', uniqueIds),
  ])

  const studentRows = studentsResult.data ?? []
  const profileRows = profilesResult.data ?? []
  const profileById = new Map(profileRows.map((p) => [p.id, p]))
  const map = new Map<string, StudentProfile>()

  for (const id of uniqueIds) {
    const student = studentRows.find((s) => s.id === id)
    const profile = profileById.get(id)
    if (!student && !profile) continue

    map.set(id, {
      id,
      reg_number: student?.reg_number ?? '',
      room_number: student?.room_number ?? '',
      hostel_block: student?.hostel_block ?? '',
      profiles: profile
        ? { full_name: profile.full_name, phone: profile.phone }
        : null,
    })
  }

  return map
}

export async function fetchAdmissionNosByStudentIds(
  profiles: Map<string, StudentProfile>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  await Promise.all(
    [...profiles.entries()].map(async ([id, profile]) => {
      const admissionNo = await fetchAdmissionNoByStudentId(id, profile.reg_number)
      if (admissionNo) map.set(id, admissionNo)
    }),
  )
  return map
}
