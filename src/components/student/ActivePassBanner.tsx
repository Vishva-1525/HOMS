import { useState } from 'react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { Button } from '@/components/ui/button'
import { PassQrSheet } from '@/components/student/PassQrSheet'
import { useCountdown } from '@/hooks/useCountdown'
import { formatReturnTime } from '@/lib/outpass'
import type { OutpassRequest, Student, StudentPassQuotas } from '@/lib/types'

interface ActivePassBannerProps {
  pass: OutpassRequest
  student: Student | null
  quotas?: StudentPassQuotas
  approvedPasses?: OutpassRequest[]
}

export function ActivePassBanner({
  pass,
  student,
  quotas,
  approvedPasses,
}: ActivePassBannerProps) {
  const countdown = useCountdown(pass.return_by)
  const [qrOpen, setQrOpen] = useState(false)

  return (
    <>
      <div className="glass-panel-strong relative overflow-hidden border-emerald-400/40 bg-gradient-to-br from-white/97 via-emerald-50/85 to-white/97 p-4 sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400/0 via-emerald-500/55 to-emerald-400/0" />
        <span className="absolute right-3 top-3 rounded-full bg-[var(--svce-green-tint)] px-2.5 py-0.5 text-[length:var(--svce-text-small)] font-semibold text-emerald-800">
          Active pass
        </span>

        <div className="pr-24">
          <p className="text-sm font-semibold text-emerald-900">{pass.destination}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PassTypeBadge type={pass.pass_type} />
          </div>
          <p className="dashboard-muted mt-2 text-sm">
            Return by {formatReturnTime(pass.return_by)}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-950">
            {countdown}
          </p>
        </div>

        {student && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3 w-full sm:w-auto"
            onClick={() => setQrOpen(true)}
          >
            View QR
          </Button>
        )}
      </div>

      <PassQrSheet
        open={qrOpen}
        pass={pass}
        quotas={quotas}
        approvedPasses={approvedPasses}
        onClose={() => setQrOpen(false)}
      />
    </>
  )
}
