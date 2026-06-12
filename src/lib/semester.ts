export function getCurrentSemesterRange(): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  // SVCE academic calendar: Sem 1 (Jul–Dec), Sem 2 (Jan–Jun)
  if (month >= 6) {
    return {
      start: new Date(year, 6, 1),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
    }
  }

  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 5, 30, 23, 59, 59, 999),
  }
}

export function isWithinSemester(dateIso: string): boolean {
  const date = new Date(dateIso)
  const { start, end } = getCurrentSemesterRange()
  return date >= start && date <= end
}
