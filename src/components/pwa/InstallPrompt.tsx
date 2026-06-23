import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    function handleBeforeInstall(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  if (isStandalone || dismissed || !deferredPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-lg rounded-xl border border-[#BFDBFE] bg-white p-4 shadow-lg md:bottom-6 md:left-auto">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBF3FF]">
          <Download className="h-5 w-5 text-[#1A5CA0]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#1A1A2E]">Install HOMS app</p>
          <p className="mt-1 text-xs text-slate-600">
            Add to your home screen for faster access and push notifications on mobile.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-[#1A5CA0] text-white hover:bg-[#154a85]"
              onClick={async () => {
                await deferredPrompt.prompt()
                setDeferredPrompt(null)
              }}
            >
              Install
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setDismissed(true)}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
