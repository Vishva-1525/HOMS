/**
 * India / Tamil Nadu public holidays for hostel planning calendars.
 * Weekend (Sat/Sun) marking is handled separately in the UI.
 *
 * Lunar/festival dates are listed for recent years; extend as needed.
 */

export interface PublicHoliday {
  /** YYYY-MM-DD (IST calendar date) */
  date: string
  label: string
  /** national | tamil_nadu | festival */
  kind: 'national' | 'tamil_nadu' | 'festival'
}

const HOLIDAYS: PublicHoliday[] = [
  // 2025
  { date: '2025-01-01', label: "New Year's Day", kind: 'festival' },
  { date: '2025-01-14', label: 'Pongal', kind: 'tamil_nadu' },
  { date: '2025-01-15', label: 'Thiruvalluvar Day', kind: 'tamil_nadu' },
  { date: '2025-01-16', label: 'Uzhavar Thirunal', kind: 'tamil_nadu' },
  { date: '2025-01-26', label: 'Republic Day', kind: 'national' },
  { date: '2025-03-14', label: 'Holika Dahan', kind: 'festival' },
  { date: '2025-03-31', label: 'Ramzan (Eid-ul-Fitr)', kind: 'festival' },
  { date: '2025-04-10', label: 'Mahavir Jayanti', kind: 'festival' },
  { date: '2025-04-14', label: 'Tamil New Year / Dr Ambedkar Jayanti', kind: 'tamil_nadu' },
  { date: '2025-04-18', label: 'Good Friday', kind: 'festival' },
  { date: '2025-05-01', label: 'May Day', kind: 'national' },
  { date: '2025-06-07', label: 'Bakrid (Eid-ul-Adha)', kind: 'festival' },
  { date: '2025-08-15', label: 'Independence Day', kind: 'national' },
  { date: '2025-08-16', label: 'Krishna Jayanthi', kind: 'festival' },
  { date: '2025-08-27', label: 'Vinayagar Chaturthi', kind: 'tamil_nadu' },
  { date: '2025-10-01', label: 'Ayutha Pooja', kind: 'tamil_nadu' },
  { date: '2025-10-02', label: 'Gandhi Jayanti / Vijayadasami', kind: 'national' },
  { date: '2025-10-20', label: 'Diwali (Deepavali)', kind: 'festival' },
  { date: '2025-12-25', label: 'Christmas', kind: 'festival' },

  // 2026
  { date: '2026-01-01', label: "New Year's Day", kind: 'festival' },
  { date: '2026-01-14', label: 'Pongal', kind: 'tamil_nadu' },
  { date: '2026-01-15', label: 'Thiruvalluvar Day', kind: 'tamil_nadu' },
  { date: '2026-01-16', label: 'Uzhavar Thirunal', kind: 'tamil_nadu' },
  { date: '2026-01-26', label: 'Republic Day', kind: 'national' },
  { date: '2026-03-03', label: 'Holika Dahan', kind: 'festival' },
  { date: '2026-03-21', label: 'Ramzan (Eid-ul-Fitr)', kind: 'festival' },
  { date: '2026-03-27', label: 'Good Friday', kind: 'festival' },
  { date: '2026-03-31', label: 'Mahavir Jayanti', kind: 'festival' },
  { date: '2026-04-14', label: 'Tamil New Year / Dr Ambedkar Jayanti', kind: 'tamil_nadu' },
  { date: '2026-05-01', label: 'May Day', kind: 'national' },
  { date: '2026-05-27', label: 'Bakrid (Eid-ul-Adha)', kind: 'festival' },
  { date: '2026-08-15', label: 'Independence Day', kind: 'national' },
  { date: '2026-09-04', label: 'Krishna Jayanthi', kind: 'festival' },
  { date: '2026-09-14', label: 'Vinayagar Chaturthi', kind: 'tamil_nadu' },
  { date: '2026-10-02', label: 'Gandhi Jayanti', kind: 'national' },
  { date: '2026-10-20', label: 'Ayutha Pooja', kind: 'tamil_nadu' },
  { date: '2026-10-21', label: 'Vijayadasami', kind: 'festival' },
  { date: '2026-11-08', label: 'Diwali (Deepavali)', kind: 'festival' },
  { date: '2026-12-25', label: 'Christmas', kind: 'festival' },

  // 2027
  { date: '2027-01-01', label: "New Year's Day", kind: 'festival' },
  { date: '2027-01-14', label: 'Pongal', kind: 'tamil_nadu' },
  { date: '2027-01-15', label: 'Thiruvalluvar Day', kind: 'tamil_nadu' },
  { date: '2027-01-16', label: 'Uzhavar Thirunal', kind: 'tamil_nadu' },
  { date: '2027-01-26', label: 'Republic Day', kind: 'national' },
  { date: '2027-03-11', label: 'Ramzan (Eid-ul-Fitr)', kind: 'festival' },
  { date: '2027-03-22', label: 'Holika Dahan', kind: 'festival' },
  { date: '2027-03-26', label: 'Good Friday', kind: 'festival' },
  { date: '2027-04-14', label: 'Tamil New Year / Dr Ambedkar Jayanti', kind: 'tamil_nadu' },
  { date: '2027-04-20', label: 'Mahavir Jayanti', kind: 'festival' },
  { date: '2027-05-01', label: 'May Day', kind: 'national' },
  { date: '2027-05-17', label: 'Bakrid (Eid-ul-Adha)', kind: 'festival' },
  { date: '2027-08-15', label: 'Independence Day', kind: 'national' },
  { date: '2027-08-25', label: 'Krishna Jayanthi', kind: 'festival' },
  { date: '2027-09-04', label: 'Vinayagar Chaturthi', kind: 'tamil_nadu' },
  { date: '2027-10-02', label: 'Gandhi Jayanti', kind: 'national' },
  { date: '2027-10-09', label: 'Ayutha Pooja', kind: 'tamil_nadu' },
  { date: '2027-10-10', label: 'Vijayadasami', kind: 'festival' },
  { date: '2027-10-29', label: 'Diwali (Deepavali)', kind: 'festival' },
  { date: '2027-12-25', label: 'Christmas', kind: 'festival' },
]

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getHolidaysForYear(year: number): PublicHoliday[] {
  return HOLIDAYS.filter((h) => h.date.startsWith(`${year}-`))
}

export function buildHolidayMap(year: number): Map<string, PublicHoliday> {
  const map = new Map<string, PublicHoliday>()
  for (const holiday of getHolidaysForYear(year)) {
    map.set(holiday.date, holiday)
  }
  return map
}

export function isWeekend(dateKey: string): boolean {
  const dow = parseDateKey(dateKey).getDay()
  return dow === 0 || dow === 6
}

export function availableHolidayYears(): number[] {
  const years = new Set(HOLIDAYS.map((h) => Number(h.date.slice(0, 4))))
  const current = new Date().getFullYear()
  years.add(current)
  years.add(current + 1)
  return [...years].sort((a, b) => a - b)
}
