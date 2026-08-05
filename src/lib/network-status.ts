type NetworkListener = (online: boolean) => void

const listeners = new Set<NetworkListener>()

function readOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

let cachedOnline = readOnline()

export function isOnline(): boolean {
  return cachedOnline
}

export function subscribeNetworkStatus(listener: NetworkListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  const next = readOnline()
  if (next === cachedOnline) return
  cachedOnline = next
  for (const listener of listeners) listener(next)
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', notify)
  window.addEventListener('offline', notify)
}
