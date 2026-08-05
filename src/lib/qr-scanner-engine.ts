import {
  BarcodeFormat,
  DecodeHintType,
  type DecodeHintType as DecodeHintTypeKey,
} from '@zxing/library'

export interface QrCameraDevice {
  deviceId: string
  label: string
}

export interface QrScannerEngineOptions {
  video: HTMLVideoElement
  /** Prefer this device when present; otherwise auto-pick. */
  deviceId?: string | null
  onDecode: (text: string) => void
  onError?: (message: string) => void
}

export interface QrScannerEngineControls {
  stop: () => void
  toggleTorch?: () => Promise<boolean>
  torchAvailable: boolean
  cameraLabel: string | null
  deviceId: string | null
}

const SCAN_HINTS = new Map<DecodeHintTypeKey, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.CHARACTER_SET, 'UTF-8'],
])

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike
  }
}

function scoreVideoDevice(label: string): number {
  const l = label.toLowerCase()
  let score = 0
  if (/usb|scanner|barcode|document|external|capture|2d|qr/i.test(l)) score += 50
  if (/back|rear|environment/i.test(l)) score += 20
  if (/facetime|integrated|built-?in|ir camera|infrared|continuity/i.test(l)) score -= 40
  return score
}

/** List cameras after permission so labels are populated. */
export async function listQrCameras(): Promise<QrCameraDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []

  try {
    const warm = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    warm.getTracks().forEach((t) => t.stop())
  } catch {
    // Permission may already be granted or denied; still try enumerate.
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'videoinput' && d.deviceId)
    .map((d, index) => ({
      deviceId: d.deviceId,
      label: d.label?.trim() || `Camera ${index + 1}`,
    }))
    .sort((a, b) => scoreVideoDevice(b.label) - scoreVideoDevice(a.label))
}

async function openCameraStream(preferredDeviceId?: string | null): Promise<{
  stream: MediaStream
  deviceId: string | null
  label: string | null
}> {
  const cameras = await listQrCameras()
  if (cameras.length === 0) {
    throw new Error('No camera found. Connect the USB QR camera and allow browser camera access.')
  }

  const preferred =
    (preferredDeviceId && cameras.find((c) => c.deviceId === preferredDeviceId))
    || cameras[0]

  const attempts: MediaStreamConstraints[] = [
    // Soft constraints first — harsh mins cause black/failed streams on many USB cams.
    {
      audio: false,
      video: {
        deviceId: { exact: preferred.deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    {
      audio: false,
      video: { deviceId: { exact: preferred.deviceId } },
    },
    { audio: false, video: true },
  ]

  let lastError: unknown
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const track = stream.getVideoTracks()[0]
      return {
        stream,
        deviceId: track?.getSettings?.().deviceId ?? preferred.deviceId,
        label: track?.label || preferred.label,
      }
    } catch (err) {
      lastError = err
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not open camera stream.')
}

async function attachStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.muted = true
  video.autoplay = true
  video.controls = false
  video.srcObject = stream

  // Wait until the element has real frames (avoids permanent black canvas).
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('Camera started but produced no video frames.'))
    }, 8000)

    const onReady = () => {
      cleanup()
      resolve()
    }

    const cleanup = () => {
      window.clearTimeout(timeout)
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('playing', onReady)
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      cleanup()
      resolve()
      return
    }

    video.addEventListener('loadeddata', onReady)
    video.addEventListener('playing', onReady)
  })

  try {
    await video.play()
  } catch {
    // Autoplay can fail until a gesture; muted + playsinline usually works.
  }
}

function getTorchTrack(stream: MediaStream): MediaStreamTrack | null {
  return stream.getVideoTracks()[0] ?? null
}

async function setTorch(track: MediaStreamTrack, enabled: boolean): Promise<void> {
  const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined
  if (!capabilities?.torch) return
  await track.applyConstraints({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] })
}

/**
 * Decode from the already-playing video without letting ZXing open a second
 * camera session (decodeFromVideoElement does that and often yields a black screen).
 */
function startDecodeLoop(
  video: HTMLVideoElement,
  onDecode: (text: string) => void,
  signal: AbortSignal,
): () => void {
  let busy = false
  let raf = 0
  let zxingReader: { decodeFromCanvas: (canvas: HTMLCanvasElement) => unknown } | null = null
  const canvas = document.createElement('canvas')
  const nativeDetector = window.BarcodeDetector
    ? new window.BarcodeDetector({ formats: ['qr_code'] })
    : null

  async function ensureZxing() {
    if (zxingReader) return zxingReader
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    zxingReader = new BrowserMultiFormatReader(SCAN_HINTS, {
      delayBetweenScanAttempts: 100,
      delayBetweenScanSuccess: 1500,
    })
    return zxingReader
  }

  const tick = async () => {
    if (signal.aborted) return

    if (
      !busy
      && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && video.videoWidth > 0
      && video.videoHeight > 0
    ) {
      busy = true
      try {
        if (nativeDetector) {
          const codes = await nativeDetector.detect(video)
          const value = codes.find((c) => c.rawValue?.trim())?.rawValue?.trim()
          if (value) {
            onDecode(value)
            busy = false
            if (!signal.aborted) raf = requestAnimationFrame(tick)
            return
          }
        }

        const reader = await ensureZxing()
        const w = video.videoWidth
        const h = video.videoHeight
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h)
          try {
            const result = reader.decodeFromCanvas(canvas) as { getText?: () => string } | null
            const text = result?.getText?.()?.trim()
            if (text) onDecode(text)
          } catch {
            // NotFoundException every frame is expected.
          }
        }
      } catch {
        // keep scanning
      } finally {
        busy = false
      }
    }

    if (!signal.aborted) {
      raf = requestAnimationFrame(tick)
    }
  }

  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
  }
}

export async function startQrScannerEngine(
  options: QrScannerEngineOptions,
): Promise<QrScannerEngineControls> {
  const { video, deviceId, onDecode, onError } = options
  const abort = new AbortController()
  let torchOn = false
  let stream: MediaStream | null = null
  let stopDecode: (() => void) | null = null

  try {
    const opened = await openCameraStream(deviceId)
    stream = opened.stream
    await attachStreamToVideo(video, stream)

    const track = getTorchTrack(stream)
    const torchAvailable = Boolean(
      (track?.getCapabilities?.() as { torch?: boolean } | undefined)?.torch,
    )

    stopDecode = startDecodeLoop(video, (text) => {
      if (!abort.signal.aborted) onDecode(text)
    }, abort.signal)

    return {
      torchAvailable,
      cameraLabel: opened.label,
      deviceId: opened.deviceId,
      toggleTorch: torchAvailable && track
        ? async () => {
            torchOn = !torchOn
            await setTorch(track, torchOn)
            return torchOn
          }
        : undefined,
      stop: () => {
        abort.abort()
        stopDecode?.()
        stopDecode = null
        stream?.getTracks().forEach((t) => t.stop())
        stream = null
        video.srcObject = null
      },
    }
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Camera permission denied. Allow camera access, then reload.'
        : err instanceof DOMException && err.name === 'NotFoundError'
          ? 'No camera found. Plug in the USB QR camera and reload.'
          : err instanceof Error
            ? err.message
            : 'Could not start camera.'
    onError?.(message)
    stopDecode?.()
    stream?.getTracks().forEach((t) => t.stop())
    video.srcObject = null
    throw err
  }
}
