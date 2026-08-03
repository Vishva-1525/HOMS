import { useEffect, useRef } from 'react'

/**
 * Desktop 2D barcode/QR scanners typically act as a keyboard wedge:
 * they type the decoded payload quickly and finish with Enter (or Tab).
 */
const IDLE_CLEAR_MS = 500
const MIN_SCAN_LENGTH = 4

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

interface UseHardwareScannerOptions {
  enabled: boolean
  onScan: (raw: string) => void
}

export function useHardwareScanner({ enabled, onScan }: UseHardwareScannerOptions) {
  const bufferRef = useRef('')
  const idleTimerRef = useRef<number | null>(null)
  const onScanRef = useRef(onScan)

  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = ''
      if (idleTimerRef.current != null) {
        window.clearTimeout(idleTimerRef.current)
        idleTimerRef.current = null
      }
      return
    }

    function clearIdleTimer() {
      if (idleTimerRef.current != null) {
        window.clearTimeout(idleTimerRef.current)
        idleTimerRef.current = null
      }
    }

    function scheduleIdleClear() {
      clearIdleTimer()
      idleTimerRef.current = window.setTimeout(() => {
        bufferRef.current = ''
        idleTimerRef.current = null
      }, IDLE_CLEAR_MS)
    }

    function flush() {
      clearIdleTimer()
      const value = bufferRef.current.trim()
      bufferRef.current = ''
      if (value.length >= MIN_SCAN_LENGTH) {
        onScanRef.current(value)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!enabled) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isEditableTarget(event.target)) return

      if (event.key === 'Enter' || event.key === 'Tab') {
        if (bufferRef.current.length >= MIN_SCAN_LENGTH) {
          event.preventDefault()
          flush()
        } else {
          bufferRef.current = ''
          clearIdleTimer()
        }
        return
      }

      if (event.key === 'Escape') {
        bufferRef.current = ''
        clearIdleTimer()
        return
      }

      if (event.key === 'Backspace') {
        bufferRef.current = bufferRef.current.slice(0, -1)
        scheduleIdleClear()
        return
      }

      if (event.key.length === 1) {
        // Keep focus on the scan page; avoid browser find-as-you-type.
        event.preventDefault()
        bufferRef.current += event.key
        scheduleIdleClear()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearIdleTimer()
    }
  }, [enabled])
}
