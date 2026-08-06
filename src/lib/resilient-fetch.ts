import { isTransientNetworkError } from '@/lib/network-error'

const DEFAULT_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 400
/** Per-attempt cap so hung TCP / auth locks cannot freeze dashboards forever. */
const DEFAULT_TIMEOUT_MS = 15_000

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function jitter(ms: number) {
  return ms + Math.floor(Math.random() * 150)
}

function abortError(message: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, 'AbortError')
  }
  const err = new Error(message)
  err.name = 'AbortError'
  return err
}

/** Prefer native `AbortSignal.timeout` when available. */
function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }

  const controller = new AbortController()
  window.setTimeout(() => controller.abort(abortError('The operation was aborted due to timeout')), ms)
  return controller.signal
}

function mergeAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any([a, b])
  }

  const controller = new AbortController()
  const forward = () => {
    if (!controller.signal.aborted) {
      controller.abort(a.aborted ? a.reason : b.reason)
    }
  }
  if (a.aborted || b.aborted) {
    forward()
    return controller.signal
  }
  a.addEventListener('abort', forward, { once: true })
  b.addEventListener('abort', forward, { once: true })
  return controller.signal
}

/**
 * Drop-in fetch that retries transient network failures and aborts hung attempts.
 * Used by the Supabase client so all API calls are more resilient
 * on unstable campus Wi‑Fi / intermittent DNS.
 */
export function createResilientFetch(
  retries = DEFAULT_RETRIES,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let lastError: unknown

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutSignal = createTimeoutSignal(timeoutMs)
        const signal = init?.signal
          ? mergeAbortSignals(init.signal, timeoutSignal)
          : timeoutSignal

        const response = await fetch(input, { ...init, signal })

        // Retry a few gateway/transient server statuses
        if (
          attempt < retries
          && (response.status === 408
            || response.status === 425
            || response.status === 429
            || response.status === 502
            || response.status === 503
            || response.status === 504)
        ) {
          await sleep(jitter(baseDelayMs * 2 ** attempt))
          continue
        }

        return response
      } catch (error) {
        lastError = error
        if (attempt >= retries || !isTransientNetworkError(error)) {
          throw error
        }
        await sleep(jitter(baseDelayMs * 2 ** attempt))
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to fetch')
  }
}
