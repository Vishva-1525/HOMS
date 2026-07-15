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
    <div
      className={cn(
        'relative flex flex-col justify-between overflow-hidden px-8 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16',
        className,
      )}
    >
      <div className="relative z-10 flex flex-1 flex-col justify-center">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <SvceEmblem size="xl" withRing className="shadow-xl shadow-black/25" />

          <div className="mt-10 max-w-md space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
              SVCE Hostel
            </p>
            <h1 className="text-2xl font-semibold leading-snug text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] sm:text-[30px]">
              {SVCE_APP_NAME}
            </h1>
            <p className="text-sm leading-relaxed text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]">
              {SVCE_COLLEGE_NAME}
            </p>
          </div>
        </div>

        <ul className="mt-12 space-y-4 lg:mt-14">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/25 ring-1 ring-white/40 backdrop-blur-[2px]">
                <Icon className="h-4 w-4 text-[#E87722]" strokeWidth={1.75} />
              </span>
              <span className="text-sm text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 mt-12 text-center text-xs text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] lg:text-left">
        Autonomous Institution · Affiliated to Anna University
      </p>
    </div>
  )
}
