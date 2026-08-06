import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseCameraQrScannerOptions {
  enabled: boolean
  /** Bump to force a fresh camera session after each successful scan. */
  sessionKey?: number
  onScan: (raw: string) => void
}

/**
 * Live camera preview + continuous QR decode.
 */
export function useCameraQrScanner({
  enabled,
  sessionKey = 0,
  onScan,
}: UseCameraQrScannerOptions) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    setVideoEl(node)
  }, [])
  const controlsRef = useRef<IScannerControls | null>(null)
  const onScanRef = useRef(onScan)
  const handledRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) {
      handledRef.current = false
      controlsRef.current?.stop()
      controlsRef.current = null
      if (videoEl?.srcObject) {
        for (const track of (videoEl.srcObject as MediaStream).getTracks()) {
          track.stop()
        }
        videoEl.srcObject = null
      }
      setStarting(false)
      return
    }

    if (!videoEl) return

    let cancelled = false
    handledRef.current = false
    setStarting(true)
    setError(null)

    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 200,
      delayBetweenScanSuccess: 1500,
    })

    void (async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'user' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoEl,
          (result, _err, controls) => {
            if (cancelled || handledRef.current) return
            const text = result?.getText()?.trim()
            if (!text) return
            handledRef.current = true
            try {
              controls.stop()
            } catch {
              // ignore
            }
            onScanRef.current(text)
          },
        )
        if (cancelled) {
          controls.stop()
          return
        }
        controlsRef.current = controls
        setStarting(false)
      } catch (err) {
        if (cancelled) return
        setStarting(false)
        const message = err instanceof Error ? err.message : 'Camera unavailable'
        setError(
          /Permission|NotAllowed/i.test(message)
            ? 'Camera permission denied. Use the desktop QR scanner, or allow camera access.'
            : 'Camera unavailable. Use the desktop QR scanner instead.',
        )
      }
    })()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [enabled, videoEl, sessionKey])

  return { videoRef, error, starting }
}
