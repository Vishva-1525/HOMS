import { useEffect, useRef } from 'react'
import { registerSW } from 'virtual:pwa-register'

/** Register the service worker early so push works when the app is backgrounded or closed. */
export function PwaBootstrap() {
  const registeredRef = useRef(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || registeredRef.current) return

    registeredRef.current = true
    const updateSW = registerSW({
      immediate: true,
      onRegistered(registration) {
        if (registration) {
          console.info('HOMS service worker registered')
          // Poll for a new deploy so blank stale-cache states clear quickly.
          window.setInterval(() => {
            void registration.update()
          }, 60_000)
        }
      },
      onNeedRefresh() {
        // New assets available — take them immediately to avoid blank screens.
        void updateSW(true)
      },
      onOfflineReady() {
        console.info('HOMS ready for offline use')
      },
    })
  }, [])

  return null
}
