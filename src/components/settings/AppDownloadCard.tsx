import { Download, Monitor, Share, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { getApkDownloadUrl, isAndroidDevice, isMobileDevice } from '@/lib/app-download'
import { cn } from '@/lib/utils'

export function AppDownloadCard({ className }: { className?: string }) {
  const apkUrl = getApkDownloadUrl()
  const { canInstall, isStandalone, isIos, promptInstall } = usePwaInstall()
  const android = isAndroidDevice()
  const mobile = isMobileDevice()

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
            <h2 className="dashboard-heading text-base font-semibold">Download HOMS app</h2>
            <p className="dashboard-muted mt-0.5 text-sm">
              Install on your phone for faster access and push notifications.
            </p>
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
        ) : null}

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
          <p className="flex items-center gap-2 font-medium text-[#1A5CA0]">
            <Monitor className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Security gate computer (no internet)
          </p>
          <p className="mt-2 text-slate-700">
            Do <strong>not</strong> save the website as HTML — that only downloads one file and
            will not work. On a laptop with internet, run{' '}
            <code className="rounded bg-white px-1 py-0.5 text-xs">npm run package:portable</code>{' '}
            in the HOMS project, copy <strong>HOMS-Portable.zip</strong> to a pendrive, unzip on the
            old PC, and double-click <strong>START-HOMS.bat</strong>.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a
            href={apkUrl}
            download="homs.apk"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[#1A5CA0] px-4 text-sm font-medium text-white transition-colors hover:bg-[#154a85]"
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Download APK
          </a>

          {canInstall && !isStandalone && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void promptInstall()}
            >
              Install from browser
            </Button>
          )}
        </div>

        <p className="text-xs leading-relaxed text-slate-600">
          {android
            ? 'After downloading, open the APK file and allow installation from this source if prompted.'
            : mobile
              ? 'Use “Install from browser” on Android Chrome, or download the APK and transfer it to an Android device.'
              : 'Download the APK and install it on an Android phone or tablet. Desktop browsers can continue using the web app.'}
        </p>
      </div>
    </section>
  )
}
