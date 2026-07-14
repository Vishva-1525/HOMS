import { isTransientNetworkError } from '@/lib/network-error'

const DEFAULT_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 400

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function jitter(ms: number) {
  return ms + Math.floor(Math.random() * 150)
}

/**
 * Drop-in fetch that retries transient network failures.
 * Used by the Supabase client so all API calls are more resilient
 * on unstable campus Wi‑Fi / intermittent DNS.
 */
export function createResilientFetch(
  retries = DEFAULT_RETRIES,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let lastError: unknown

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(input, init)

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
