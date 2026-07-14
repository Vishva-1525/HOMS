/** Tiny in-memory TTL cache for shared RPC / lookup / page results across hooks. */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

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
