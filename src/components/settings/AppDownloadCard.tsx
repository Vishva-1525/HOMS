import { Download, Share, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { cn } from '@/lib/utils'

export function AppDownloadCard({ className }: { className?: string }) {
  const { canInstall, isStandalone, isIos, promptInstall } = usePwaInstall()

  return (
    <section
      className={cn(
        'glass-panel-strong overflow-hidden',
        className,
      )}
    >
      <div className="border-b border-[var(--glass-border)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EBF3FF] ring-1 ring-[#1A5CA0]/15">
            <Smartphone className="h-5 w-5 text-[#1A5CA0]" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="dashboard-heading text-base font-semibold">Install HOMS app</h2>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {isStandalone ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            HOMS is already installed on this device.
          </p>
        ) : isIos ? (
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EBF3FF]/60 px-4 py-3 text-sm text-slate-800">
            <p className="flex items-center gap-2 font-medium text-[#1A5CA0]">
              <Share className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Install on iPhone / iPad
            </p>
            <p className="mt-2 text-slate-700">
              Open HOMS in Safari, tap <strong>Share</strong>, then{' '}
              <strong>Add to Home Screen</strong>.
            </p>
          </div>
        ) : canInstall ? (
          <Button
            type="button"
            className="w-full gap-2 sm:w-auto"
            onClick={() => void promptInstall()}
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Install app
          </Button>
        ) : (
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EBF3FF]/60 px-4 py-3 text-sm text-slate-800">
            <p className="font-medium text-[#1A5CA0]">Install from your browser</p>
            <p className="mt-2 text-slate-700">
              In Chrome, open the browser menu and choose <strong>Install app</strong> or{' '}
              <strong>Add to Home screen</strong>.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
