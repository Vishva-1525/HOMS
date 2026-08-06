import { Bell, BellOff, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export function PushPermissionBanner({ compact = false }: { compact?: boolean }) {
  const {
    state,
    enabling,
    lastError,
    isSupported,
    hasVapidKey,
    iosNeedsInstall,
    supportHint,
    enablePush,
    disablePush,
  } = usePushNotifications()

  if (!hasVapidKey) {
    return (
      <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
        Background push is not configured yet (missing VAPID public key). Ask an admin to finish Web
        Push setup so alerts work when the app is closed.
      </div>
    )
  }

  if (iosNeedsInstall) {
    return (
      <div className="rounded-xl border border-[#BFDBFE] bg-[#EBF3FF]/80 px-4 py-3 text-sm text-[#0D3F72]">
        <p className="font-medium">Enable alerts on iPhone / iPad</p>
        <p className="mt-1 text-sm leading-relaxed text-[#1A5CA0]">
          Tap <Share className="inline h-3.5 w-3.5" strokeWidth={2} /> Share → <strong>Add to Home Screen</strong>,
          open HOMS from that icon, then enable notifications. Safari tabs cannot receive push alerts.
        </p>
      </div>
    )
  }

  if (!isSupported) {
    if (!supportHint) return null
    return (
      <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
        {supportHint}
      </div>
    )
  }

  if (state === 'granted') {
    if (compact) return null
    return (
      <div className="dashboard-surface-muted flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-[#1A5CA0]" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-medium text-[#1A1A2E]">Push notifications enabled</p>
            <p className="text-sm text-slate-600">
              Alerts arrive even when HOMS is closed or your phone is locked.
            </p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => void disablePush()}>
          <BellOff className="h-4 w-4" />
          Disable
        </Button>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
        Notifications are blocked in your device settings. Enable them for HOMS to receive outpass alerts.
      </div>
    )
  }

  return (
    <div className="dashboard-surface-muted flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-[#1A5CA0]" strokeWidth={1.75} />
        <div>
          <p className="text-sm font-medium text-[#1A1A2E]">Enable push notifications</p>
          <p className="text-sm text-slate-600">
            Get approvals and requests instantly — even when the app is closed.
          </p>
          {lastError && <p className="mt-1 text-sm text-[#DC2626]">{lastError}</p>}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="bg-[#1A5CA0] text-white hover:bg-[#154a85]"
        disabled={enabling}
        onClick={() => void enablePush()}
      >
        {enabling ? 'Enabling…' : 'Enable notifications'}
      </Button>
    </div>
  )
}
