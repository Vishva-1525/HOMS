import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
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

  async function downloadQr() {
    const canvas = canvasRef.current
    if (!canvas) return

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    )
    if (!blob) return

    const file = new File([blob], `pass-${pass.id.slice(0, 8)}.png`, { type: 'image/png' })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'HOMS Pass QR',
        })
        return
      } catch {
        // fall through to download
      }
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-xl border bg-white p-3">
        <QRCodeCanvas ref={canvasRef} value={qrValue} size={200} level="M" />
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={downloadQr}>
        Download QR
      </Button>
    </div>
  )
}
