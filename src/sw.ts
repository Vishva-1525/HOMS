/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Do NOT cache HTML navigations. A NetworkFirst HTML cache caused blank /
// "Something went wrong" loops after deploys: slow network → stale index.html
// → hashed JS 404 → React crash → reload → same stale HTML.

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.includes('homs-navigations') || key.includes('navigations'))
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.skipWaiting()

interface PushPayload {
  title?: string
  body?: string
  url?: string
  type?: string
  notificationId?: string
}

self.addEventListener('push', (event) => {
  // Always show a system notification — this is what wakes locked / closed phones.
  let payload: PushPayload = {}
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {}
  } catch {
    try {
      const text = event.data?.text()
      if (text) payload = { body: text }
    } catch {
      /* ignore malformed payloads */
    }
  }

  const title = payload.title ?? 'HOMS - SVCE Hostel'
  const tag = payload.notificationId
    ? `homs-${payload.notificationId}`
    : (payload.type ?? 'homs-notification')

  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: payload.body ?? 'You have a new update.',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag,
    renotify: true,
    data: {
      url: payload.url ?? '/',
      notificationId: payload.notificationId,
    },
    vibrate: [120, 60, 120],
    requireInteraction: payload.type === 'pending' || payload.type === 'approved',
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
        if (!client.url.startsWith(self.location.origin)) continue
        if ('focus' in client) {
          const focused = await client.focus()
          if (focused && 'navigate' in focused) {
            try {
              await (focused as WindowClient).navigate(targetUrl)
              return focused
            } catch {
              /* navigate may be unsupported on older browsers */
            }
          }
          return focused
        }
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  // Browser rotated the push subscription — ask open clients to re-subscribe.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: 'homs-push-subscription-changed' })
      }
    }),
  )
})
