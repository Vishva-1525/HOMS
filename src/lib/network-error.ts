/** Detect transient browser/network failures (common across flaky Wi‑Fi / firewalls). */
export function isTransientNetworkError(error: unknown): boolean {
  if (!error) return false

  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : String(error)

  const normalized = message.toLowerCase()
  return (
    normalized.includes('failed to fetch')
    || normalized.includes('networkerror')
    || normalized.includes('network request failed')
    || normalized.includes('load failed')
    || normalized.includes('fetch failed')
    || normalized.includes('err_network')
    || normalized.includes('err_connection')
    || normalized.includes('err_name_not_resolved')
    || normalized.includes('err_internet_disconnected')
    || normalized.includes('timeout')
    || normalized.includes('timed out')
    || normalized.includes('abort')
  )
}

/** User-facing copy instead of raw "TypeError: Failed to fetch". */
export function formatNetworkError(error: unknown, fallback = 'Something went wrong.'): string {
  if (isTransientNetworkError(error)) {
    return 'Unable to reach the server. Check your internet connection and try again.'
  }

  if (typeof error === 'string' && error.trim()) return error
  if (error instanceof Error && error.message.trim()) return error.message
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof (error as { message: unknown }).message === 'string'
  ) {
    const msg = (error as { message: string }).message.trim()
    if (msg) return msg
  }

  return fallback
}
