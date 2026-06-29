export const EXTENSION_DURATION_OPTIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 2, label: '2 hours' },
  { hours: 3, label: '3 hours' },
  { hours: 6, label: '6 hours' },
  { hours: 12, label: '12 hours' },
  { hours: 24, label: '24 hours' },
] as const

export function computeExtendedReturnTime(returnByIso: string, additionalHours: number): Date {
  return new Date(new Date(returnByIso).getTime() + additionalHours * 60 * 60 * 1000)
}

export function formatExtensionDuration(hours: number): string {
  const match = EXTENSION_DURATION_OPTIONS.find((o) => o.hours === hours)
  return match?.label ?? `${hours}h`
}
