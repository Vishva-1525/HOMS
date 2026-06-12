import { useEffect, useRef, useState } from 'react'
import { Flashlight, FlashlightOff, Loader2 } from 'lucide-react'
import { ScanFrameOverlay } from '@/components/security/ScanFrameOverlay'
import { startQrScannerEngine, type QrScannerEngineControls } from '@/lib/qr-scanner-engine'

interface QrScannerProps {
  active: boolean
  onScan: (decodedText: string) => void
}

export function QrScanner({ active, onScan }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const engineRef = useRef<QrScannerEngineControls | null>(null)
  const handledRef = useRef(false)
  const onScanRef = useRef(onScan)
  const [starting, setStarting] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  onScanRef.current = onScan

  useEffect(() => {
    if (!active) {
      handledRef.current = false
      setCameraError(null)
      setTorchOn(false)
      setTorchAvailable(false)
      engineRef.current?.stop()
      engineRef.current = null
      return
    }

    const video = videoRef.current
    if (!video) return

    handledRef.current = false
    let mounted = true

    setStarting(true)
    setCameraError(null)

    startQrScannerEngine({
      video,
      onDecode: (text) => {
        if (!mounted || handledRef.current || !text.trim()) return
        handledRef.current = true
        onScanRef.current(text)
      },
      onError: (message) => {
        if (mounted) setCameraError(message)
      },
    })
      .then((controls) => {
        if (!mounted) {
          controls.stop()
          return
        }
        engineRef.current = controls
        setTorchAvailable(controls.torchAvailable)
        setStarting(false)
      })
      .catch(() => {
        if (mounted) setStarting(false)
      })

    return () => {
      mounted = false
      engineRef.current?.stop()
      engineRef.current = null
    }
  }, [active])

  async function handleTorchToggle() {
    const next = await engineRef.current?.toggleTorch?.()
    if (typeof next === 'boolean') setTorchOn(next)
  }

  const showCamera = active && !cameraError && !starting

  return (
    <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-t-[inherit] bg-black">
      <video
        ref={videoRef}
        className="h-full min-h-[240px] w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {showCamera && <ScanFrameOverlay />}

      {active && starting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
          <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden />
          <p className="text-sm text-white/90">Starting camera…</p>
        </div>
      )}

      {active && cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-6 text-center">
          <div>
            <p className="text-sm font-medium text-white">Camera unavailable</p>
            <p className="mt-2 text-sm text-white/75">{cameraError}</p>
            <p className="mt-3 text-xs text-white/60">
              Use manual pass ID entry below, or reload after granting permission.
            </p>
          </div>
        </div>
      )}

      {showCamera && torchAvailable && (
        <button
          type="button"
          onClick={handleTorchToggle}
          className="absolute bottom-3 right-3 rounded-full bg-black/55 p-2.5 text-white backdrop-blur-sm"
          aria-label={torchOn ? 'Turn torch off' : 'Turn torch on'}
        >
          {torchOn ? (
            <FlashlightOff className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Flashlight className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
      )}

      {showCamera && (
        <p className="pointer-events-none absolute left-0 right-0 top-3 text-center text-xs text-white/80">
          Hold steady · works in low light
        </p>
      )}
    </div>
  )
}
