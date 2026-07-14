/** Tiny in-memory TTL cache for shared RPC / lookup results across hooks. */

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

export function invalidateCachedQuery(keyPrefix: string) {
  for (const key of store.keys()) {
    if (key === keyPrefix || key.startsWith(keyPrefix)) store.delete(key)
  }
}
