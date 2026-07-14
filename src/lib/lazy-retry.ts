import type { ComponentType } from 'react'

const CHUNK_RELOAD_KEY = 'homs-chunk-reload'

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('importing a module script failed')
  )
}

/**
 * Retries a dynamic import once, then reloads the page after a new deploy
 * invalidates cached chunk URLs (common cause of refresh failures on SPAs).
 */
export function lazyWithRetry<T extends { default: ComponentType<any> }>(
  importer: () => Promise<T>,
): Promise<T> {
  return importer().catch((error: unknown) => {
    if (!isChunkLoadError(error)) throw error

    const reloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY)
    if (!reloaded) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      window.location.reload()
      return new Promise<T>(() => {})
    }

    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    throw error
  })
}
