import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'homs.sc'
const RESYNC_AFTER_MS = 5 * 60_000

let anchor: { serverMs: number; perfMs: number } | null = null
let pending: Promise<void> | null = null

function readLastKnown(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function writeLastKnown(ms: number) {
  try {
    if (ms > readLastKnown()) localStorage.setItem(STORAGE_KEY, String(ms))
  } catch {
    /* storage unavailable */
  }
}

/** Anchor the clock to a server timestamp (ISO string or epoch ms). */
export function anchorServerClock(serverTime: string | number) {
  const serverMs = typeof serverTime === 'number' ? serverTime : new Date(serverTime).getTime()
  if (!Number.isFinite(serverMs)) return
  anchor = { serverMs, perfMs: performance.now() }
  writeLastKnown(serverMs)
}

/** Current time from the server's point of view; falls back to the device only when never synced. */
export function serverNow(): number {
  if (anchor) return anchor.serverMs + (performance.now() - anchor.perfMs)
  return Math.max(Date.now(), readLastKnown())
}

export function syncServerClock(force = false): Promise<void> {
  if (!force && anchor && performance.now() - anchor.perfMs < RESYNC_AFTER_MS) {
    return Promise.resolve()
  }
  if (pending) return pending

  pending = (async () => {
    try {
      const { data, error } = await supabase.rpc('get_server_time')
      if (!error && data) anchorServerClock(data as string)
    } catch {
      /* offline: keep previous anchor */
    } finally {
      pending = null
    }
  })()
  return pending
}

if (typeof document !== 'undefined') {
  void syncServerClock()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncServerClock(true)
  })
}
