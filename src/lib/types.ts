export type UserRole =
  | 'student'
  | 'warden'
  | 'security_guard'
  | 'parent'
  | 'admin'

export type PassType = 'outpass' | 'staypass' | 'night_pass'

export type OutpassStatus = 'pending' | 'approved' | 'rejected' | 'extended' | 'cancelled'

export type ExtensionStatus = 'pending' | 'approved' | 'rejected'

export type GateEventType = 'exit' | 'entry'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone: string
  password_changed: boolean
  created_at: string
}

export interface Student {
  id: string
  reg_number: string
  room_number: string
  hostel_block: string
  date_of_birth: string | null
  parent_phone: string
  parent_email: string
  department: string
  year_of_study: number
  is_active?: boolean
}

export interface OutpassRequest {
  id: string
  student_id: string
  pass_type: PassType
  destination: string
  reason: string
  departure_at: string
  return_by: string
  status: OutpassStatus
  warden_remark: string | null
  approved_by: string | null
  qr_code_data: string | null
  approved_at: string | null
  created_at: string
  is_overdue?: boolean
  admin_override_note?: string | null
}

export interface StudentProfile {
  id?: string
  reg_number: string
  room_number: string
  hostel_block: string
  profiles: { full_name: string; phone?: string } | null
}

export interface OutpassWithStudent extends OutpassRequest {
  students: StudentProfile | null
}

export interface ExtensionWithOutpass extends ExtensionRequest {
  outpass_requests: (OutpassRequest & { students: StudentProfile | null }) | null
}

export interface GateLog {
  id: string
  outpass_id: string
  scanned_by: string
  event_type: GateEventType
  scanned_at: string
}

export interface ExtensionRequest {
  id: string
  outpass_id: string
  new_return_time: string
  reason: string
  status: ExtensionStatus
  created_at: string
}

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string
          phone: string
          password_changed: boolean
          created_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          full_name?: string
          phone?: string
          password_changed?: boolean
          created_at?: string
        }
        Update: {
          role?: UserRole
          full_name?: string
          phone?: string
          password_changed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      students: {
        Row: Student
        Insert: Student
        Update: {
          reg_number?: string
          room_number?: string
          hostel_block?: string
          date_of_birth?: string | null
          parent_phone?: string
          parent_email?: string
          department?: string
          year_of_study?: number
        }
        Relationships: []
      }
      outpass_requests: {
        Row: OutpassRequest
        Insert: {
          id?: string
          student_id: string
          pass_type: PassType
          destination: string
          reason: string
          departure_at: string
          return_by: string
          status?: OutpassStatus
          warden_remark?: string | null
          approved_by?: string | null
          qr_code_data?: string | null
          created_at?: string
        }
        Update: {
          student_id?: string
          pass_type?: PassType
          destination?: string
          reason?: string
          departure_at?: string
          return_by?: string
          status?: OutpassStatus
          warden_remark?: string | null
          approved_by?: string | null
          qr_code_data?: string | null
          created_at?: string
        }
        Relationships: []
      }
      gate_logs: {
        Row: GateLog
        Insert: {
          id?: string
          outpass_id: string
          scanned_by: string
          event_type: GateEventType
          scanned_at?: string
        }
        Update: {
          outpass_id?: string
          scanned_by?: string
          event_type?: GateEventType
          scanned_at?: string
        }
        Relationships: []
      }
      extension_requests: {
        Row: ExtensionRequest
        Insert: {
          id?: string
          outpass_id: string
          new_return_time: string
          reason: string
          status?: ExtensionStatus
          created_at?: string
        }
        Update: {
          outpass_id?: string
          new_return_time?: string
          reason?: string
          status?: ExtensionStatus
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_student_login_email: {
        Args: { reg_number_input: string }
        Returns: string
      }
      get_student_admission_no: {
        Args: { p_student_id: string }
        Returns: string
      }
      get_student_gate_info: {
        Args: { p_student_id: string }
        Returns: Record<string, unknown> | null
      }
      get_admin_stats: {
        Args: Record<string, never>
        Returns: Json
      }
      get_admin_activity_feed: {
        Args: { p_limit?: number }
        Returns: Json
      }
      get_admin_staff_list: {
        Args: { p_role: string }
        Returns: Json
      }
      get_outpass_report: {
        Args: {
          p_start: string
          p_end: string
          p_hostel_block?: string | null
          p_department?: string | null
          p_limit?: number
        }
        Returns: Json
      }
    }
  }
}

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
