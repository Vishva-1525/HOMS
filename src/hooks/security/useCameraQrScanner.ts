import { useCallback, useEffect, useRef, useState } from 'react'
import {
  startQrScannerEngine,
  type QrScannerEngineControls,
} from '@/lib/qr-scanner-engine'
import { scanDebug } from '@/lib/security-scan-debug'

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
 * Uses startQrScannerEngine (own getUserMedia + frame wait + canvas/BarcodeDetector)
 * instead of ZXing decodeFromConstraints, which often shows preview but never decodes.
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

  const controlsRef = useRef<QrScannerEngineControls | null>(null)
  const onScanRef = useRef(onScan)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  onScanRef.current = onScan

  useEffect(() => {
    let cancelled = false

    function stopEverything() {
      controlsRef.current?.stop()
      controlsRef.current = null
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
    scanDebug('Camera starting', { sessionKey })

    void (async () => {
      try {
        const controls = await startQrScannerEngine({
          video: videoEl,
          onDecode: (text) => {
            if (cancelled) return
            const value = text.trim()
            if (!value) return
            scanDebug('Camera Detected QR', value)
            // Pause this session; parent bumps sessionKey after the result dwell.
            try {
              controlsRef.current?.stop()
            } catch {
              // ignore
            }
            controlsRef.current = null
            onScanRef.current(value)
          },
          onError: (message) => {
            if (cancelled) return
            scanDebug('Camera engine error', message)
            setError(message)
          },
        })

        if (cancelled) {
          controls.stop()
          return
        }

        controlsRef.current = controls
        setStarting(false)
        scanDebug('Camera ready', {
          label: controls.cameraLabel,
          deviceId: controls.deviceId,
        })
      } catch (err) {
        if (cancelled) return
        setStarting(false)
        const message = err instanceof Error ? err.message : 'Camera unavailable'
        scanDebug('Camera start failed', message)
        setError(
          /Permission|NotAllowed/i.test(message)
            ? 'Camera permission denied.'
            : message || 'Camera unavailable.',
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
