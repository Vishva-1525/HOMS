import { Bell, CheckCircle, FileText, QrCode } from 'lucide-react'

const FEATURES = [
  { icon: FileText, text: 'Digital outpass requests' },
  { icon: CheckCircle, text: 'Real-time warden approval' },
  { icon: QrCode, text: 'QR-verified gate entry' },
  { icon: Bell, text: 'Instant parent notifications' },
] as const

export function LoginBrandPanel() {
  return (
    <div className="flex h-full flex-col bg-[#0D3F72] px-10 py-12">
      <img
        src="/svce-logo.png"
        alt="Sri Venkateswara College of Engineering"
        className="w-[180px]"
      />

      <div className="mt-10 flex flex-1 flex-col">
        <h1 className="text-[22px] font-semibold leading-snug text-white">
          Hostel Outpass Management System
        </h1>
        <p className="mt-2 text-sm text-[#B3CCE8]">
          Sri Venkateswara College of Engineering
        </p>

        <ul className="mt-10 space-y-5">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <Icon className="h-5 w-5 shrink-0 text-[#E87722]" strokeWidth={1.75} />
              <span className="text-sm text-white">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-[#7AA5D0]">
        Autonomous Institution · Affiliated to Anna University
      </p>
    </div>
  )
}
