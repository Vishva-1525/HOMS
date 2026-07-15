import { Bell, CheckCircle, FileText, QrCode } from 'lucide-react'
import { SvceEmblem } from '@/components/branding/SvceEmblem'
import { SVCE_APP_NAME, SVCE_COLLEGE_NAME } from '@/lib/branding'
import { cn } from '@/lib/utils'

const FEATURES = [
  { icon: FileText, text: 'Digital outpass requests' },
  { icon: CheckCircle, text: 'Real-time warden approval' },
  { icon: QrCode, text: 'QR-verified gate entry' },
  { icon: Bell, text: 'Instant parent notifications' },
] as const

interface LoginBrandPanelProps {
  className?: string
}

export function LoginBrandPanel({ className }: LoginBrandPanelProps) {
  return (
    <section
      className={cn(
        'login-glass-card flex h-full min-h-0 w-full flex-col justify-between p-7 sm:p-9',
        className,
      )}
    >
      <div className="flex flex-1 flex-col justify-center">
        <div className="flex flex-col items-start text-left">
          <SvceEmblem size="xl" withRing className="shadow-lg shadow-black/10" />

          <div className="mt-8 max-w-md space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              SVCE Hostel
            </p>
            <h1 className="text-2xl font-semibold leading-snug text-slate-900 sm:text-[1.75rem]">
              {SVCE_APP_NAME}
            </h1>
            <p className="text-sm leading-relaxed text-slate-600">{SVCE_COLLEGE_NAME}</p>
          </div>
        </div>

        <ul className="mt-10 space-y-3.5">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 ring-1 ring-white/80 shadow-sm backdrop-blur-sm">
                <Icon className="h-4 w-4 text-[#E87722]" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-medium text-slate-800">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-xs text-slate-500">
        Autonomous Institution · Affiliated to Anna University
      </p>
    </section>
  )
}
