export interface AdminStats {
  total_students: number
  active_outpasses: number
  currently_outside: number
  overdue_returns: number
  pending_approval: number
  passes_this_month: number
}

export type AdminActivityEventType =
  | 'request_submitted'
  | 'request_approved'
  | 'request_rejected'
  | 'gate_exit'
  | 'gate_entry'
  | 'overdue_alert'

export interface AdminActivityRow {
  event_type: AdminActivityEventType
  source_id: string
  student_id: string
  occurred_at: string
  pass_type: string
  destination: string
  warden_remark: string | null
  return_by: string
  scanned_at: string | null
  student_name?: string
  reg_number?: string
}

export interface AdminStaffRow {
  id: string
  full_name: string
  phone: string
  role: string
  email: string
  last_sign_in_at: string | null
  assignment_value: string | null
  scans_today: number
}

export interface AdminStudentRow {
  id: string
  reg_number: string
  room_number: string
  hostel_block: string
  department: string
  year_of_study: number
  parent_phone: string
  parent_email: string
  is_active: boolean
  profiles: { full_name: string; phone: string } | null
  campus_status: 'inside' | 'outside' | 'overdue'
}

export interface AdminPassRow {
  pass: import('@/lib/types').OutpassRequest
  student_name: string
  reg_number: string
  room_number: string
  hostel_block: string
  exit_at: string | null
  entry_at: string | null
}

export type SystemSettingsMap = Record<string, string>
