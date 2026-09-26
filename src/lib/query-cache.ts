/** Tiny in-memory TTL cache for shared RPC / lookup / page results across hooks. */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

const SESSION_PREFIX = 'homs-cache:'

export async function cachedQuery<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now()
  const hit = store.get(key) as CacheEntry<T> | undefined
  if (hit && hit.expiresAt > now) return hit.value

  const pending = inflight.get(key) as Promise<T> | undefined
  if (pending) return pending

  const run = loader()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, run)
  return run
}

/** Return cached value even if expired (for stale-while-revalidate UI). */
export function peekCachedQuery<T>(key: string): T | undefined {
  const hit = store.get(key) as CacheEntry<T> | undefined
  return hit?.value
}

export function setCachedQuery<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function invalidateCachedQuery(keyPrefix: string) {
  for (const key of store.keys()) {
    if (key === keyPrefix || key.startsWith(keyPrefix)) store.delete(key)
  }
}

/** Read a sessionStorage snapshot for instant dashboard reopen on weak Wi‑Fi. */
export function readSessionCache<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { value: T; savedAt: number }
    if (!parsed || typeof parsed.savedAt !== 'number') return null
    if (Date.now() - parsed.savedAt > maxAgeMs) return null
    return parsed.value
  } catch {
    return null
  }
}

export function writeSessionCache<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(
      SESSION_PREFIX + key,
      JSON.stringify({ value, savedAt: Date.now() }),
    )
  } catch {
    // Quota / private mode — ignore
  }
}
