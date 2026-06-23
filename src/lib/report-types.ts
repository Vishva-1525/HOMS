export interface ReportRow {
  reg_number: string
  student_name: string
  room_number: string
  hostel_block: string
  department: string
  year_of_study: number
  pass_type: string
  destination: string
  reason: string
  departure_at: string
  return_by: string
  status: string
  warden_remark: string | null
  submitted_at: string
  actual_exit_time: string | null
  actual_entry_time: string | null
  hours_outside: number | null
  is_overdue: boolean
  approved_by_name: string | null
  outpass_id?: string
}

export interface ReportFilters {
  start: Date
  end: Date
  hostelBlock?: string | null
  department?: string | null
}

export interface ReportStats {
  total: number
  approved: number
  rejected: number
  overdue: number
}

export function computeReportStatsFromRows(rows: ReportRow[]): ReportStats {
  return {
    total: rows.length,
    approved: rows.filter((r) => r.status === 'approved' || r.status === 'extended').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
    overdue: rows.filter((r) => r.is_overdue).length,
  }
}
