import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export function PushPermissionBanner() {
  const { state, enabling, isSupported, hasVapidKey, enablePush, disablePush } = usePushNotifications()

  if (!isSupported) return null
  if (!hasVapidKey) return null
  if (state === 'granted') {
    return (
      <div className="dashboard-surface-muted flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-[#1A5CA0]" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-medium text-[#1A1A2E]">Push notifications enabled</p>
            <p className="text-xs text-slate-600">You will receive alerts when the app is closed.</p>
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
        Notifications are blocked in your browser settings. Enable them to receive outpass alerts.
      </div>
    )
  }

  return (
    <div className="dashboard-surface-muted flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-[#1A5CA0]" strokeWidth={1.75} />
        <div>
          <p className="text-sm font-medium text-[#1A1A2E]">Enable push notifications</p>
          <p className="text-xs text-slate-600">
            Get instant alerts for new requests, approvals, and rejections.
          </p>
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
