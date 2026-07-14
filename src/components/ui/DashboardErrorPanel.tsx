import { RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatNetworkError, isTransientNetworkError } from '@/lib/network-error'

interface DashboardErrorPanelProps {
  error: string
  onRetry?: () => void
  retrying?: boolean
  title?: string
}

export function DashboardErrorPanel({
  error,
  onRetry,
  retrying = false,
  title = 'Couldn’t load this page',
}: DashboardErrorPanelProps) {
  const message = formatNetworkError(error)
  const isNetwork = isTransientNetworkError(error) || isTransientNetworkError(message)

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-red-200/80 bg-red-50/95 px-6 py-8 text-center shadow-sm"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
        <WifiOff className="h-6 w-6" strokeWidth={1.75} aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-red-800/90">{message}</p>
      {isNetwork && (
        <p className="mt-2 text-xs text-slate-600">
          This often happens on unstable Wi‑Fi. A quick retry usually fixes it.
        </p>
      )}
      {onRetry && (
        <Button
          type="button"
          className="mt-6 gap-2"
          loading={retrying}
          onClick={onRetry}
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
          Try again
        </Button>
      )}
    </div>
  )
}
