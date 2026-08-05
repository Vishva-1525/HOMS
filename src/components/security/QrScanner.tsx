import { useEffect, useRef, useState } from 'react'
import { Camera, Flashlight, FlashlightOff, Loader2, RefreshCw } from 'lucide-react'
import { ScanFrameOverlay } from '@/components/security/ScanFrameOverlay'
import {
  listQrCameras,
  startQrScannerEngine,
  type QrCameraDevice,
  type QrScannerEngineControls,
} from '@/lib/qr-scanner-engine'

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
  const [cameraLabel, setCameraLabel] = useState<string | null>(null)
  const [cameras, setCameras] = useState<QrCameraDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const [hasFrames, setHasFrames] = useState(false)

  onScanRef.current = onScan

  useEffect(() => {
    if (!active) return
    void listQrCameras()
      .then((list) => {
        setCameras(list)
        setSelectedDeviceId((prev) => {
          if (prev && list.some((c) => c.deviceId === prev)) return prev
          return list[0]?.deviceId ?? null
        })
      })
      .catch(() => setCameras([]))
  }, [active, restartKey])

  useEffect(() => {
    if (!active) {
      handledRef.current = false
      setCameraError(null)
      setCameraLabel(null)
      setTorchOn(false)
      setTorchAvailable(false)
      setHasFrames(false)
      setStarting(false)
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
    setHasFrames(false)

    startQrScannerEngine({
      video,
      deviceId: selectedDeviceId,
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
        setCameraLabel(controls.cameraLabel)
        if (controls.deviceId) {
          setSelectedDeviceId((prev) => prev || controls.deviceId)
        }
        setStarting(false)
      })
      .catch(() => {
        if (mounted) setStarting(false)
      })

    const frameCheck = window.setInterval(() => {
      if (!mounted) return
      const ready =
        video.videoWidth > 0
        && video.videoHeight > 0
        && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      setHasFrames(ready)
    }, 250)

    return () => {
      mounted = false
      window.clearInterval(frameCheck)
      engineRef.current?.stop()
      engineRef.current = null
    }
  }, [active, selectedDeviceId, restartKey])

  async function handleTorchToggle() {
    const next = await engineRef.current?.toggleTorch?.()
    if (typeof next === 'boolean') setTorchOn(next)
  }

  function handleRetry() {
    setRestartKey((k) => k + 1)
  }

  const showLive = active && !cameraError && !starting

  return (
    <div className="relative min-h-[min(52dvh,28rem)] flex-1 overflow-hidden bg-slate-950">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {showLive && hasFrames && <ScanFrameOverlay />}

      {active && starting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/80">
          <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden />
          <p className="text-sm font-medium text-white/90">Starting live camera…</p>
        </div>
      )}

      {active && !starting && !cameraError && !hasFrames && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/85 p-6 text-center">
          <Camera className="h-8 w-8 text-white/70" aria-hidden />
          <p className="text-sm font-semibold text-white">Camera is open but view is blank</p>
          <p className="max-w-xs text-xs leading-relaxed text-white/70">
            Pick another camera below (USB QR camera if listed), or retry. If your USB reader is
            keyboard-only, it has no live video — use a USB camera device.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
            Retry camera
          </button>
        </div>
      )}

      {active && cameraError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/95 p-6 text-center">
          <div className="max-w-xs">
            <p className="text-sm font-semibold text-white">Camera unavailable</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">{cameraError}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
              Retry
            </button>
          </div>
        </div>
      )}

      {showLive && (
        <div className="pointer-events-none absolute left-0 right-0 top-3 z-20 px-3 text-center">
          <p className="text-xs font-medium tracking-wide text-white/90 drop-shadow">
            Live scanner view · aim at the student pass QR
          </p>
          {cameraLabel && (
            <p className="mt-1 truncate text-[10px] text-white/65 drop-shadow">{cameraLabel}</p>
          )}
        </div>
      )}

      {active && cameras.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="homs-camera-select">
            Camera
          </label>
          <select
            id="homs-camera-select"
            value={selectedDeviceId ?? ''}
            onChange={(e) => setSelectedDeviceId(e.target.value || null)}
            className="min-w-0 flex-1 rounded-lg border border-white/25 bg-black/60 px-2 py-2 text-xs text-white outline-none backdrop-blur"
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label}
              </option>
            ))}
          </select>

          {torchAvailable && (
            <button
              type="button"
              onClick={() => void handleTorchToggle()}
              className="rounded-full border border-white/20 bg-black/50 p-2.5 text-white shadow-lg transition-transform active:scale-95"
              aria-label={torchOn ? 'Turn torch off' : 'Turn torch on'}
            >
              {torchOn ? (
                <FlashlightOff className="h-5 w-5" strokeWidth={1.75} />
              ) : (
                <Flashlight className="h-5 w-5" strokeWidth={1.75} />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
