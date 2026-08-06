import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import {
  getPushSupportHint,
  getVapidPublicKey,
  isIosDevice,
  isPushSupported,
  isStandalonePwa,
  refreshPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-notifications'

export type PushPermissionState = 'unsupported' | 'default' | 'granted' | 'denied' | 'configured'

export function usePushNotifications() {
  const { user } = useAuth()
  const [state, setState] = useState<PushPermissionState>('default')
  const [enabling, setEnabling] = useState(false)
  const [standalone, setStandalone] = useState(() =>
    typeof window !== 'undefined' ? isStandalonePwa() : false,
  )
  const [lastError, setLastError] = useState<string | null>(null)

  const refreshState = useCallback(() => {
    setStandalone(isStandalonePwa())
    if (!getVapidPublicKey()) {
      setState('default')
      return
    }
    if (!isPushSupported()) {
      setState('unsupported')
      return
    }
    setState(Notification.permission as PushPermissionState)
  }, [])

  useEffect(() => {
    refreshState()
  }, [refreshState])

  // Subscribe on login and keep subscription fresh when app returns to foreground.
  useEffect(() => {
    if (!user || !isPushSupported() || !getVapidPublicKey()) return
    if (Notification.permission !== 'granted') return

    const userId = user.id

    void refreshPushSubscription(userId).then((ok) => {
      if (ok) setState('granted')
    })

    function onVisible() {
      if (document.visibilityState !== 'visible') return
      void refreshPushSubscription(userId)
    }

    function onSwMessage(event: MessageEvent) {
      if (event.data?.type !== 'homs-push-subscription-changed') return
      void subscribeToPush(userId).then((ok) => {
        if (ok) setState('granted')
      })
    }

    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    navigator.serviceWorker?.addEventListener('message', onSwMessage)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      navigator.serviceWorker?.removeEventListener('message', onSwMessage)
    }
  }, [user, standalone])

  async function enablePush(): Promise<boolean> {
    if (!user) return false
    setEnabling(true)
    setLastError(null)
    try {
      const ok = await subscribeToPush(user.id)
      refreshState()
      if (!ok) {
        setLastError(
          getVapidPublicKey()
            ? 'Could not enable notifications. Check browser permission and try again.'
            : 'Push is not configured on this deployment (missing VAPID public key).',
        )
      }
      return ok
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not enable notifications.'
      setLastError(message)
      refreshState()
      return false
    } finally {
      setEnabling(false)
    }
  }

  async function disablePush(): Promise<void> {
    if (!user) return
    await unsubscribeFromPush(user.id)
    refreshState()
  }

  return {
    state,
    enabling,
    lastError,
    isSupported: isPushSupported(),
    hasVapidKey: Boolean(getVapidPublicKey()),
    iosNeedsInstall: isIosDevice() && !standalone,
    supportHint: getPushSupportHint(),
    enablePush,
    disablePush,
    refreshState,
  }
}
