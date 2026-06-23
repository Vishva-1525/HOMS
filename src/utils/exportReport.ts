import { format, parseISO } from 'date-fns'
import * as XLSX from 'xlsx'
import type { ReportRow } from '@/lib/report-types'

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy')
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'hh:mm aa')
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy hh:mm aa')
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

export function exportReportToExcel(
  data: ReportRow[],
  reportType: string,
  dateLabel: string,
): string {
  const headerRows = [
    ['Sri Venkateswara College of Engineering'],
    [`Hostel Outpass Report — ${reportType} — ${dateLabel}`],
    [
      `Generated on: ${new Date().toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short',
      })}`,
    ],
    [],
  ]

  const columnHeaders = [
    'S.No',
    'Student Name',
    'Register Number',
    'Room No',
    'Block',
    'Department',
    'Year',
    'Pass Type',
    'Destination',
    'Reason',
    'Departure Date',
    'Departure Time',
    'Return By (Scheduled)',
    'Actual Exit Time',
    'Actual Entry Time',
    'Hours Outside',
    'Status',
    'Overdue',
    'Approved By',
    'Warden Remark',
  ]

  const dataRows = data.map((row, index) => [
    index + 1,
    row.student_name,
    row.reg_number,
    row.room_number,
    row.hostel_block,
    row.department,
    `${row.year_of_study} Year`,
    row.pass_type.replace('_', ' ').toUpperCase(),
    row.destination,
    row.reason,
    formatDate(row.departure_at),
    formatTime(row.departure_at),
    formatDateTime(row.return_by),
    row.actual_exit_time ? formatTime(row.actual_exit_time) : '—',
    row.actual_entry_time ? formatTime(row.actual_entry_time) : '—',
    row.hours_outside != null ? formatDuration(row.hours_outside) : '—',
    row.status.toUpperCase(),
    row.is_overdue ? 'YES' : 'No',
    row.approved_by_name || '—',
    row.warden_remark || '—',
  ])

  const summaryRows = [
    [],
    ['--- Summary ---'],
    ['Total Records', data.length],
    ['Approved', data.filter((r) => r.status === 'approved' || r.status === 'extended').length],
    ['Rejected', data.filter((r) => r.status === 'rejected').length],
    ['Overdue', data.filter((r) => r.is_overdue).length],
    ['Completed (returned)', data.filter((r) => r.actual_entry_time).length],
  ]

  const allRows = [...headerRows, columnHeaders, ...dataRows, ...summaryRows]
  const ws = XLSX.utils.aoa_to_sheet(allRows)

  ws['!cols'] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 16 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 6 },
    { wch: 12 },
    { wch: 20 },
    { wch: 25 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 18 },
    { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Outpass Report')

  const summaryWs = XLSX.utils.aoa_to_sheet([
    ['SVCE Hostel — Report Summary'],
    [`Period: ${dateLabel}`],
    [],
    ['Metric', 'Count'],
    ['Total requests', data.length],
    ['Approved', data.filter((r) => r.status === 'approved' || r.status === 'extended').length],
    ['Rejected', data.filter((r) => r.status === 'rejected').length],
    ['Pending', data.filter((r) => r.status === 'pending').length],
    ['Overdue', data.filter((r) => r.is_overdue).length],
    ['Students who exited', data.filter((r) => r.actual_exit_time).length],
    ['Students who returned', data.filter((r) => r.actual_entry_time).length],
    [
      'Did not return (active)',
      data.filter((r) => r.actual_exit_time && !r.actual_entry_time).length,
    ],
  ])
  summaryWs['!cols'] = [{ wch: 35 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  const filename = `SVCE_Outpass_${reportType}_${dateLabel.replace(/\s/g, '_')}.xlsx`
  XLSX.writeFile(wb, filename)
  return filename
}
