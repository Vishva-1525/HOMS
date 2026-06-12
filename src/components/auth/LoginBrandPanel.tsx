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
        'relative flex flex-col justify-between overflow-hidden px-8 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0D3F72]/20 via-transparent to-[#0D3F72]/40" />

      <div className="relative z-10">
        <SvceEmblem size="xl" withRing className="shadow-xl shadow-black/20" />

        <div className="mt-8 max-w-md space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
            SVCE Hostel
          </p>
          <h1 className="text-2xl font-semibold leading-snug text-white sm:text-[28px]">
            {SVCE_APP_NAME}
          </h1>
          <p className="text-sm leading-relaxed text-white/80">{SVCE_COLLEGE_NAME}</p>
        </div>

        <ul className="mt-10 space-y-4 sm:mt-12">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Icon className="h-4 w-4 text-[#E87722]" strokeWidth={1.75} />
              </span>
              <span className="text-sm text-white/90">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 mt-10 text-xs text-white/55">
        Autonomous Institution · Affiliated to Anna University
      </p>
    </div>
  )
}
