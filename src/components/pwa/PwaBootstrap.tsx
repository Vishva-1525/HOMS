import { useEffect } from 'react'
import { registerSW } from 'virtual:pwa-register'

/** Defer SW registration until after first paint so it doesn’t contend with boot. */
export function PwaBootstrap() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let cancelled = false
    let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined

    const timer = window.setTimeout(() => {
      if (cancelled) return
      updateSW = registerSW({
        immediate: false,
        onRegistered(registration) {
          if (registration) {
            console.info('HOMS service worker registered')
          }
        },
      })
    }, 2500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      void updateSW
    }
  }, [])

  return null
}
