import { useState } from 'react'
import { PassTypeBadge } from '@/components/ui/PassTypeBadge'
import { Button } from '@/components/ui/button'
import { PassQrSheet } from '@/components/student/PassQrSheet'
import { useCountdown } from '@/hooks/useCountdown'
import { formatReturnTime } from '@/lib/outpass'
import type { OutpassRequest, Student } from '@/lib/types'

interface ActivePassBannerProps {
  pass: OutpassRequest
  student: Student | null
}

export function ActivePassBanner({ pass, student }: ActivePassBannerProps) {
  const countdown = useCountdown(pass.return_by)
  const [qrOpen, setQrOpen] = useState(false)

  return (
    <>
      <div className="relative rounded-xl border border-[#2E8B44] bg-[#EBF7EE] p-4">
        <span className="absolute right-3 top-3 rounded-[var(--radius-full)] bg-[var(--svce-green-tint)] px-2.5 py-0.5 text-[length:var(--svce-text-small)] font-medium text-[#166534]">
          Active pass
        </span>

        <div className="pr-24">
          <p className="text-sm font-medium text-[#166534]">{pass.destination}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PassTypeBadge type={pass.pass_type} />
          </div>
          <p className="mt-2 text-sm text-[#4B5563]">
            Return by {formatReturnTime(pass.return_by)}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#1A1A2E]">
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

      {student && (
        <PassQrSheet
          open={qrOpen}
          pass={pass}
          regNumber={student.reg_number}
          onClose={() => setQrOpen(false)}
        />
      )}
    </>
  )
}
