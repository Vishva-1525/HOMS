/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)

self.skipWaiting()

interface PushPayload {
  title?: string
  body?: string
  url?: string
  type?: string
}

self.addEventListener('push', (event) => {
  const payload: PushPayload = event.data ? event.data.json() : {}
  const title = payload.title ?? 'HOMS — SVCE Hostel'
  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: payload.body ?? 'You have a new update.',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: payload.type ?? 'homs-notification',
    renotify: true,
    data: { url: payload.url ?? '/' },
    vibrate: [120, 60, 120],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetPath = (event.notification.data?.url as string | undefined) ?? '/'
  const targetUrl = new URL(targetPath, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          const focused = await client.focus()
          if (focused && 'navigate' in focused) {
            try {
              await (focused as WindowClient).navigate(targetUrl)
            } catch {
              /* navigate may be unsupported */
            }
          }
          return focused
        }
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
