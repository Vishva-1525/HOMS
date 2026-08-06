import { useEffect, useState, useSyncExternalStore } from 'react'
import { isIosDevice, isStandalonePwa } from '@/lib/push-notifications'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Listener = () => void

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<Listener>()
let listening = false

function emit() {
  for (const listener of listeners) listener()
}

function ensureListening() {
  if (listening || typeof window === 'undefined') return
  listening = true

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    emit()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit()
  })
}

function subscribe(listener: Listener) {
  ensureListening()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return deferredPrompt
}

function getServerSnapshot() {
  return null
}

export function usePwaInstall() {
  const promptEvent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    ensureListening()
    setIsStandalone(isStandalonePwa())
    setIsIos(isIosDevice())
  }, [])

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt) return 'unavailable'
    const current = deferredPrompt
    await current.prompt()
    const { outcome } = await current.userChoice
    deferredPrompt = null
    emit()
    return outcome
  }

  return {
    canInstall: Boolean(promptEvent) && !isStandalone,
    isStandalone,
    isIos,
    promptInstall,
  }
}
