/**
 * Boot gate: purge broken PWA caches BEFORE loading the React app.
 * Must stay free of static imports so the entry chunk cannot pull
 * unrelated libs (xlsx/jspdf) or race module evaluation.
 */
const CACHE_EPOCH_KEY = 'homs-cache-epoch-v4'

async function purgeClientCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }
  if ('caches' in window) {
    const cacheKeys = await caches.keys()
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)))
  }
}

function showPurgeMessage(): void {
  const root = document.getElementById('root')
  if (!root) return
  root.textContent = 'Updating HOMS… clearing old cache…'
  root.style.cssText =
    'min-height:100dvh;display:flex;align-items:center;justify-content:center;font:600 15px system-ui;color:#0D3F72;background:#F5F7FA'
}

async function boot(): Promise<void> {
  let needsPurge = false
  try {
    needsPurge = localStorage.getItem(CACHE_EPOCH_KEY) !== '1'
  } catch {
    needsPurge = false
  }

  if (needsPurge) {
    showPurgeMessage()
    try {
      await purgeClientCaches()
    } catch (err) {
      console.warn('HOMS cache purge failed:', err)
    }
    try {
      localStorage.setItem(CACHE_EPOCH_KEY, '1')
    } catch {
      /* ignore */
    }
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('_homs_boot', String(Date.now()))
    window.location.replace(nextUrl.toString())
    return
  }

  await import('./main.tsx')
}

void boot()
