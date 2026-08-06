import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Share2 } from 'lucide-react'
import { PassQrPlaceholder } from '@/components/student/PassQrPlaceholder'
import { Button } from '@/components/ui/button'
import { useQrUnlockCountdown } from '@/hooks/useQrUnlockCountdown'
import { isQrEligibleStatus } from '@/lib/pass-filters'
import { buildPassQrValue } from '@/lib/pass-qr'
import type { OutpassRequest } from '@/lib/types'

interface PassQrCodeProps {
  pass: OutpassRequest
}

export function PassQrCode({ pass }: PassQrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const unlock = useQrUnlockCountdown(pass)

  if (!isQrEligibleStatus(pass.status)) {
    return <PassQrPlaceholder status={pass.status} />
  }

  if (Date.now() > new Date(pass.return_by).getTime()) {
    return <PassQrPlaceholder status={pass.status} variant="expired" />
  }

  if (!unlock.ready) {
    return (
      <PassQrPlaceholder
        status={pass.status}
        variant="before-departure"
        opensAt={unlock.opensAtLabel}
        countdownLabel={unlock.remainingLabel}
        windowMinutes={unlock.windowMinutes}
      />
    )
  }

  const qrValue = buildPassQrValue(pass)
  const entryCode = pass.entry_code

  async function getQrBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }

  async function downloadQr() {
    const blob = await getQrBlob()
    if (!blob) return

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pass-${pass.id.slice(0, 8)}.png`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function shareQr() {
    const blob = await getQrBlob()
    if (!blob) return

    const file = new File([blob], `pass-${pass.id.slice(0, 8)}.png`, { type: 'image/png' })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'HOMS Pass QR' })
      return
    }

    await downloadQr()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-white p-4 shadow-md">
        <QRCodeCanvas
          ref={canvasRef}
          value={qrValue}
          size={220}
          level="M"
          includeMargin
          fgColor="#000000"
          bgColor="#FFFFFF"
        />
      </div>

      {entryCode && (
        <div className="w-full rounded-xl border border-[#1A5CA0]/20 bg-[#1A5CA0]/5 px-4 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Gate entry code
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-[#1A5CA0]">
            {entryCode}
          </p>
        </div>
      )}

      <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row">
        <Button type="button" className="qr-action-primary flex-1 gap-2" onClick={downloadQr}>
          Download QR
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="qr-action-secondary flex-1 gap-2"
          onClick={shareQr}
        >
          <Share2 className="h-4 w-4" strokeWidth={1.75} />
          Share
        </Button>
      </div>
    </div>
  )
}
