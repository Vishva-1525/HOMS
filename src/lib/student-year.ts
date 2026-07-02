const YEAR_LABELS: Record<number, string> = {
  1: 'First Year',
  2: 'Second Year',
  3: 'Third Year',
  4: 'Fourth Year',
}

export function formatStudentYearLabel(year: number): string {
  return YEAR_LABELS[year] ?? `Year ${year}`
}

export const STUDENT_YEAR_ORDER = [1, 2, 3, 4] as const
