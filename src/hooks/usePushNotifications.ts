import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import {
  getPushSupportHint,
  getVapidPublicKey,
  isIosDevice,
  isPushSupported,
  isStandalonePwa,
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

  useEffect(() => {
    if (!user || !isPushSupported() || !getVapidPublicKey()) return
    if (Notification.permission !== 'granted') return

    void subscribeToPush(user.id).then((ok) => {
      if (ok) setState('granted')
    })
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
