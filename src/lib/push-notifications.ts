import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Web Push works on Android/desktop anytime; on iOS only in the installed Home Screen app (16.4+). */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return false
  }
  if (isIosDevice() && !isStandalonePwa()) return false
  return true
}

export function getPushSupportHint(): string | null {
  if (typeof window === 'undefined') return null
  if (isIosDevice() && !isStandalonePwa()) {
    return 'On iPhone/iPad: tap Share → Add to Home Screen, open HOMS from the home screen icon, then enable notifications.'
  }
  if (!('Notification' in window) || !('PushManager' in window)) {
    return 'Push notifications are not supported in this browser.'
  }
  return null
}

export function getVapidPublicKey(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim()
  return key || null
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.ready
}

async function upsertPushSubscription(
  userId: string,
  subscription: PushSubscription,
): Promise<boolean> {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

  const now = new Date().toISOString()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      device_label: navigator.userAgent.slice(0, 120),
      last_seen_at: now,
      updated_at: now,
    },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) {
    console.error('Failed to save push subscription', error.message)
    return false
  }
  return true
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false

  const vapidKey = getVapidPublicKey()
  if (!vapidKey) {
    console.warn('VITE_VAPID_PUBLIC_KEY is not set — cannot subscribe to Web Push')
    return false
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const registration = await registerServiceWorker()
  if (!registration) return false

  const applicationServerKey = urlBase64ToUint8Array(vapidKey) as BufferSource

  let subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    // Re-subscribe if the existing subscription was created with a different VAPID key.
    try {
      await subscription.unsubscribe()
    } catch {
      /* ignore */
    }
    subscription = null
  }

  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  })

  return upsertPushSubscription(userId, subscription)
}

/** Re-sync an existing subscription and refresh last_seen_at (call on login / app focus). */
export async function refreshPushSubscription(userId: string): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false
  if (!getVapidPublicKey()) return false

  const registration = await registerServiceWorker()
  if (!registration) return false

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    return subscribeToPush(userId)
  }

  return upsertPushSubscription(userId, subscription)
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint)
}

export function showLocalNotification(
  title: string,
  body: string,
  url = '/',
  notificationId?: string,
): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const tag = notificationId ? `homs-${notificationId}` : `homs-local-${url}`

  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.ready.then((registration) => {
      const options: NotificationOptions & { renotify?: boolean } = {
        body,
        icon: '/pwa-icon-192.png',
        badge: '/pwa-icon-192.png',
        data: { url },
        tag,
        renotify: true,
      }
      void registration.showNotification(title, options)
    })
    return
  }

  new Notification(title, { body, icon: '/pwa-icon-192.png' })
}

export async function requestNotificationDispatch(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('notification-dispatch', {
      body: { notification_id: notificationId },
    })
    if (error) console.warn('notification-dispatch failed', error.message)
  } catch (err) {
    console.warn('notification-dispatch invoke error', err)
  }
}

/** Flush pending outbox so push is sent even when the recipient's app is closed. */
export async function flushNotificationOutbox(): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('notification-dispatch', {
      body: { flush: true },
    })
    if (error) {
      console.warn('notification-dispatch flush failed', error.message)
      // One retry for transient gateway / cold-start failures.
      await new Promise((r) => setTimeout(r, 800))
      const retry = await supabase.functions.invoke('notification-dispatch', {
        body: { flush: true },
      })
      if (retry.error) console.warn('notification-dispatch flush retry failed', retry.error.message)
    }
  } catch (err) {
    console.warn('notification-dispatch flush error', err)
  }
}
