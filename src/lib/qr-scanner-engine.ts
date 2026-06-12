import {
  BarcodeFormat,
  DecodeHintType,
  type DecodeHintType as DecodeHintTypeKey,
} from '@zxing/library'

export interface QrScannerEngineOptions {
  video: HTMLVideoElement
  onDecode: (text: string) => void
  onError?: (message: string) => void
}

export interface QrScannerEngineControls {
  stop: () => void
  toggleTorch?: () => Promise<boolean>
  torchAvailable: boolean
}

const SCAN_HINTS = new Map<DecodeHintTypeKey, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.CHARACTER_SET, 'UTF-8'],
])

const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920, min: 640 },
  height: { ideal: 1080, min: 480 },
  frameRate: { ideal: 30, min: 15 },
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike
  }
}

function pickRearCamera(deviceId: string | undefined, label: string): boolean {
  if (!deviceId) return true
  return /back|rear|environment|trás|arrière/i.test(label)
}

async function getRearCameraDeviceId(): Promise<string | undefined> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  const videoInputs = devices.filter((d) => d.kind === 'videoinput')
  const rear = videoInputs.find((d) => pickRearCamera(d.deviceId, d.label))
  return rear?.deviceId ?? videoInputs[0]?.deviceId
}

async function startVideoStream(video: HTMLVideoElement): Promise<MediaStream> {
  const deviceId = await getRearCameraDeviceId()

  const stream = await navigator.mediaDevices.getUserMedia({
    video: deviceId
      ? { ...CAMERA_CONSTRAINTS, deviceId: { exact: deviceId } }
      : CAMERA_CONSTRAINTS,
    audio: false,
  })

  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  video.muted = true
  await video.play()
  return stream
}

function getTorchTrack(stream: MediaStream): MediaStreamTrack | null {
  return stream.getVideoTracks()[0] ?? null
}

async function setTorch(track: MediaStreamTrack, enabled: boolean): Promise<void> {
  const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined
  if (!capabilities?.torch) return
  await track.applyConstraints({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] })
}

async function startBarcodeDetectorLoop(
  video: HTMLVideoElement,
  onDecode: (text: string) => void,
  signal: AbortSignal,
): Promise<boolean> {
  if (!window.BarcodeDetector) return false

  const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
  let busy = false

  const tick = async () => {
    if (signal.aborted || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      if (!signal.aborted) requestAnimationFrame(tick)
      return
    }

    if (!busy) {
      busy = true
      try {
        const codes = await detector.detect(video)
        const value = codes.find((c) => c.rawValue?.trim())?.rawValue?.trim()
        if (value) {
          onDecode(value)
          return
        }
      } catch {
        // keep scanning
      } finally {
        busy = false
      }
    }

    if (!signal.aborted) requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
  return true
}

async function startZxingLoop(
  video: HTMLVideoElement,
  onDecode: (text: string) => void,
  signal: AbortSignal,
): Promise<() => void> {
  const { BrowserQRCodeReader } = await import('@zxing/browser')
  const reader = new BrowserQRCodeReader(SCAN_HINTS, {
    delayBetweenScanAttempts: 80,
    delayBetweenScanSuccess: 1200,
  })

  const controls = await reader.decodeFromVideoElement(video, (result, _error, ctrl) => {
    if (signal.aborted) {
      ctrl.stop()
      return
    }
    const text = result?.getText()?.trim()
    if (text) onDecode(text)
  })

  return () => controls.stop()
}

export async function startQrScannerEngine(
  options: QrScannerEngineOptions,
): Promise<QrScannerEngineControls> {
  const { video, onDecode, onError } = options
  const abort = new AbortController()
  let torchOn = false
  let stream: MediaStream | null = null
  let stopZxing: (() => void) | null = null

  try {
    stream = await startVideoStream(video)
    const track = getTorchTrack(stream)
    const torchAvailable = Boolean(
      (track?.getCapabilities?.() as { torch?: boolean } | undefined)?.torch,
    )

    const handleDecode = (text: string) => {
      if (abort.signal.aborted) return
      onDecode(text)
    }

    const nativeStarted = await startBarcodeDetectorLoop(video, handleDecode, abort.signal)

    if (!nativeStarted) {
      stopZxing = await startZxingLoop(video, handleDecode, abort.signal)
    } else {
      stopZxing = await startZxingLoop(video, handleDecode, abort.signal)
    }

    return {
      torchAvailable,
      toggleTorch: torchAvailable && track
        ? async () => {
            torchOn = !torchOn
            await setTorch(track, torchOn)
            return torchOn
          }
        : undefined,
      stop: () => {
        abort.abort()
        stopZxing?.()
        stopZxing = null
        stream?.getTracks().forEach((t) => t.stop())
        stream = null
        video.srcObject = null
      },
    }
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Camera permission denied. Allow camera access to scan passes.'
        : err instanceof Error
          ? err.message
          : 'Could not start camera.'
    onError?.(message)
    throw err
  }
}
