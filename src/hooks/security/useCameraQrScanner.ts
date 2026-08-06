import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseCameraQrScannerOptions {
  enabled: boolean
  /** Increment to force a clean camera restart after each completed scan. */
  sessionKey: number
  onScan: (raw: string) => void
}

/**
 * Developer-testing camera QR decode.
 * Production gates use the desk scanner; this path must still support repeated scans.
 *
 * Root-cause fix for one-shot failure:
 * - Do not latch forever if the parent rejects the scan (inFlight).
 * - Always tear down and restart when `enabled`/`sessionKey` change.
 * - Prefer a cooldown over a permanent stop while still enabled.
 */
export function useCameraQrScanner({
  enabled,
  sessionKey,
  onScan,
}: UseCameraQrScannerOptions) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    setVideoEl(node)
  }, [])

  const controlsRef = useRef<IScannerControls | null>(null)
  const onScanRef = useRef(onScan)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  onScanRef.current = onScan

  useEffect(() => {
    let cancelled = false

    function stopEverything() {
      controlsRef.current?.stop()
      controlsRef.current = null
      if (videoEl?.srcObject) {
        for (const track of (videoEl.srcObject as MediaStream).getTracks()) {
          track.stop()
        }
        videoEl.srcObject = null
      }
    }

    if (!enabled || !videoEl) {
      stopEverything()
      setStarting(false)
      return () => {
        cancelled = true
        stopEverything()
      }
    }

    setStarting(true)
    setError(null)

    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 200,
      delayBetweenScanSuccess: 1200,
    })

    void (async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              // Laptops used for testing usually only have a front camera.
              facingMode: { ideal: 'user' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoEl,
          (result, _err, controls) => {
            if (cancelled) return
            const text = result?.getText()?.trim()
            if (!text) return
            // Pause this session; parent bumps sessionKey after the result dwell.
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
            ? 'Camera permission denied.'
            : 'Camera unavailable.',
        )
      }
    })()

    return () => {
      cancelled = true
      stopEverything()
    }
  }, [enabled, videoEl, sessionKey])

  return { videoRef, error, starting }
}
