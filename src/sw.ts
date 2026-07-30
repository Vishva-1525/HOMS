/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Prefer fresh HTML after deploys so users are not stuck on a blank page from
// stale precached index.html pointing at deleted hashed assets.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'homs-navigations',
      networkTimeoutSeconds: 4,
    }),
  ),
)

self.skipWaiting()

interface PushPayload {
  title?: string
  body?: string
  url?: string
  type?: string
}

self.addEventListener('push', (event) => {
  const payload: PushPayload = event.data ? event.data.json() : {}
  const title = payload.title ?? 'HOMS - SVCE Hostel'
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
