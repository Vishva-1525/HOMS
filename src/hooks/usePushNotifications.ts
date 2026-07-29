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

  const refreshState = useCallback(() => {
    setStandalone(isStandalonePwa())
    if (!isPushSupported()) {
      setState('unsupported')
      return
    }
    if (!getVapidPublicKey()) {
      setState('default')
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

    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user, standalone])

  async function enablePush(): Promise<boolean> {
    if (!user) return false
    setEnabling(true)
    try {
      const ok = await subscribeToPush(user.id)
      refreshState()
      return ok
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
    isSupported: isPushSupported(),
    hasVapidKey: Boolean(getVapidPublicKey()),
    iosNeedsInstall: isIosDevice() && !standalone,
    supportHint: getPushSupportHint(),
    enablePush,
    disablePush,
    refreshState,
  }
}
