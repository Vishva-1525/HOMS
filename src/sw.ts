/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)

interface PushPayload {
  title?: string
  body?: string
  url?: string
  type?: string
}

self.addEventListener('push', (event) => {
  const payload: PushPayload = event.data ? event.data.json() : {}
  const title = payload.title ?? 'HOMS — SVCE Hostel'
  const options: NotificationOptions = {
    body: payload.body ?? 'You have a new update.',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: payload.type ?? 'homs-notification',
    data: { url: payload.url ?? '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string | undefined) ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
