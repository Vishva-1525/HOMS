import { supabase } from '@/lib/supabase'
import { getStudentAdmissionNo } from '@/lib/warden'
import type { StudentProfile } from '@/lib/types'

interface StudentGateInfo {
  full_name: string
  room_number: string
  hostel_block: string
  reg_number: string
}

async function fetchStudentGateInfoRpc(
  studentId: string,
): Promise<StudentGateInfo | null> {
  const { data, error } = await supabase.rpc('get_student_gate_info', {
    p_student_id: studentId,
  })

  if (error || !data || typeof data !== 'object') return null

  const row = data as Record<string, unknown>
  return {
    full_name: typeof row.full_name === 'string' ? row.full_name : '',
    room_number: typeof row.room_number === 'string' ? row.room_number : '',
    hostel_block: typeof row.hostel_block === 'string' ? row.hostel_block : '',
    reg_number: typeof row.reg_number === 'string' ? row.reg_number : '',
  }
}

function buildStudentProfile(
  studentId: string,
  gateInfo: StudentGateInfo,
  phone?: string,
): StudentProfile {
  const fullName = gateInfo.full_name.trim()
  return {
    id: studentId,
    reg_number: gateInfo.reg_number,
    room_number: gateInfo.room_number,
    hostel_block: gateInfo.hostel_block,
    profiles: fullName ? { full_name: fullName, phone } : null,
  }
}

export async function fetchStudentProfileById(
  studentId: string,
): Promise<StudentProfile | null> {
  const gateInfo = await fetchStudentGateInfoRpc(studentId)
  if (gateInfo) {
    return buildStudentProfile(studentId, gateInfo)
  }

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

  const rpcResults = await Promise.all(
    uniqueIds.map(async (id) => ({ id, gateInfo: await fetchStudentGateInfoRpc(id) })),
  )

  const map = new Map<string, StudentProfile>()
  const missingIds: string[] = []

  for (const { id, gateInfo } of rpcResults) {
    if (gateInfo) {
      map.set(id, buildStudentProfile(id, gateInfo))
    } else {
      missingIds.push(id)
    }
  }

  if (missingIds.length === 0) return map

  const [studentsResult, profilesResult] = await Promise.all([
    supabase
      .from('students')
      .select('id, reg_number, room_number, hostel_block')
      .in('id', missingIds),
    supabase.from('profiles').select('id, full_name, phone').in('id', missingIds),
  ])

  const studentRows = studentsResult.data ?? []
  const profileRows = profilesResult.data ?? []
  const profileById = new Map(profileRows.map((p) => [p.id, p]))

  for (const id of missingIds) {
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
