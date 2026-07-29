import { useEffect, useRef } from 'react'
import { registerSW } from 'virtual:pwa-register'

/** Register the service worker early so push works when the app is backgrounded or closed. */
export function PwaBootstrap() {
  const registeredRef = useRef(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || registeredRef.current) return

    registeredRef.current = true
    registerSW({
      immediate: true,
      onRegistered(registration) {
        if (registration) {
          console.info('HOMS service worker registered')
        }
      },
    })
  }, [])

  return null
}
