import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildPassQrValue } from '@/lib/pass-qr'
import type { OutpassRequest } from '@/lib/types'

interface PassQrCodeProps {
  pass: OutpassRequest
  regNumber: string
}

export function PassQrCode({ pass, regNumber }: PassQrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrValue = buildPassQrValue(pass, regNumber)

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
      <div className="rounded-xl border border-[var(--svce-border-default)] bg-white p-4">
        <QRCodeCanvas
          ref={canvasRef}
          value={qrValue}
          size={200}
          level="M"
          fgColor="#1A5CA0"
          bgColor="#FFFFFF"
        />
      </div>
      <div className="flex w-full gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={downloadQr}>
          Download QR
        </Button>
        <Button type="button" variant="secondary" className="flex-1" onClick={shareQr}>
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>
    </div>
  )
}
