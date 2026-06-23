import { useEffect } from 'react'
import { registerSW } from 'virtual:pwa-register'

export function PwaBootstrap() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const updateSW = registerSW({
      immediate: true,
      onRegistered(registration) {
        if (registration) {
          console.info('HOMS service worker registered')
        }
      },
    })

    return () => {
      void updateSW
    }
  }, [])

  return null
}
