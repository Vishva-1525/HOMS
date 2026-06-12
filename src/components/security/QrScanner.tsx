import { useEffect, useRef } from 'react'
import { ScanFrameOverlay } from '@/components/security/ScanFrameOverlay'
import { useHtml5QrcodeScript } from '@/hooks/security/useHtml5QrcodeScript'

const READER_ID = 'security-qr-reader'

interface QrScannerProps {
  active: boolean
  onScan: (decodedText: string) => void
}

export function QrScanner({ active, onScan }: QrScannerProps) {
  const { ready, error: scriptError } = useHtml5QrcodeScript()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const handledRef = useRef(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!ready || !active) return

    handledRef.current = false
    let mounted = true
    const scanner = new Html5Qrcode(READER_ID)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (handledRef.current) return
          handledRef.current = true
          onScanRef.current(decodedText)
        },
        () => {},
      )
      .catch((err: Error) => {
        if (mounted) console.error('Camera start failed:', err)
      })

    return () => {
      mounted = false
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})
      scannerRef.current = null
    }
  }, [ready, active])

  return (
    <div className="relative flex-1 overflow-hidden bg-black">
      <div id={READER_ID} className="h-full w-full [&_video]:object-cover" />

      {active && <ScanFrameOverlay />}

      {scriptError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center text-sm text-white">
          Camera unavailable: {scriptError}
        </div>
      )}
    </div>
  )
}

export { READER_ID }
