export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatTodayDate(reference = new Date()): string {
  return reference.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatPassDuration(departureIso: string, returnIso: string): string {
  const ms = new Date(returnIso).getTime() - new Date(departureIso).getTime()
  if (ms <= 0) return '—'

  const hours = Math.floor(ms / 3_600_000)
  const days = Math.floor(hours / 24)

  if (days >= 1) return `${days}d ${hours % 24}h`
  if (hours >= 1) return `${hours}h`
  return `${Math.max(1, Math.floor(ms / 60_000))}m`
}
