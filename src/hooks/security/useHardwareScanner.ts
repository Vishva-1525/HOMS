import { useEffect, useRef } from 'react'

/**
 * Desktop 2D barcode/QR scanners act as a keyboard wedge:
 * they type the decoded payload quickly and finish with Enter (or Tab/CR).
 *
 * A dedicated capture input stays focused so scans are not lost when
 * focus sits on buttons/nav, which is the usual gate-desk failure mode.
 */
const IDLE_CLEAR_MS = 1500
const MIN_SCAN_LENGTH = 4

function isManualEntryField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.dataset.hardwareScannerCapture === 'true') return false
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
  const captureRef = useRef<HTMLInputElement | null>(null)
  const enabledRef = useRef(enabled)
  const scanningLockRef = useRef(false)

  onScanRef.current = onScan
  enabledRef.current = enabled

  useEffect(() => {
    let input = captureRef.current
    if (!input) {
      input = document.createElement('input')
      input.type = 'text'
      input.autocomplete = 'off'
      input.autocapitalize = 'off'
      input.spellcheck = false
      input.inputMode = 'none'
      input.setAttribute('aria-label', 'Hardware QR scanner input')
      input.dataset.hardwareScannerCapture = 'true'
      Object.assign(input.style, {
        position: 'fixed',
        opacity: '0',
        pointerEvents: 'none',
        left: '0',
        top: '0',
        width: '1px',
        height: '1px',
        zIndex: '-1',
        border: '0',
        padding: '0',
        margin: '0',
      })
      document.body.appendChild(input)
      captureRef.current = input
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
        if (captureRef.current) captureRef.current.value = ''
        idleTimerRef.current = null
      }, IDLE_CLEAR_MS)
    }

    function flush(raw?: string) {
      clearIdleTimer()
      const value = (raw ?? bufferRef.current ?? captureRef.current?.value ?? '').trim()
      bufferRef.current = ''
      if (captureRef.current) captureRef.current.value = ''
      if (value.length < MIN_SCAN_LENGTH) return
      if (scanningLockRef.current) return
      scanningLockRef.current = true
      try {
        onScanRef.current(value)
      } finally {
        // Allow the next scan shortly after UI moves to validating/result.
        window.setTimeout(() => {
          scanningLockRef.current = false
        }, 800)
      }
    }

    function focusCapture() {
      if (!enabledRef.current) return
      const el = captureRef.current
      if (!el) return
      if (isManualEntryField(document.activeElement)) return
      if (document.activeElement === el) return
      try {
        el.focus({ preventScroll: true })
      } catch {
        el.focus()
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!enabledRef.current) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isManualEntryField(event.target)) return

      if (document.activeElement !== captureRef.current) {
        focusCapture()
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        const pending =
          bufferRef.current.trim()
          || (captureRef.current?.value.trim() ?? '')
        if (pending.length >= MIN_SCAN_LENGTH) {
          event.preventDefault()
          event.stopPropagation()
          flush(pending)
        } else {
          bufferRef.current = ''
          if (captureRef.current) captureRef.current.value = ''
          clearIdleTimer()
        }
        return
      }

      if (event.key === 'Escape') {
        bufferRef.current = ''
        if (captureRef.current) captureRef.current.value = ''
        clearIdleTimer()
        return
      }

      if (event.key === 'Backspace') {
        bufferRef.current = bufferRef.current.slice(0, -1)
        if (captureRef.current) captureRef.current.value = bufferRef.current
        scheduleIdleClear()
        return
      }

      if (event.key.length === 1) {
        event.preventDefault()
        bufferRef.current += event.key
        if (captureRef.current) captureRef.current.value = bufferRef.current
        scheduleIdleClear()
      }
    }

    function onCaptureInput() {
      if (!enabledRef.current || !captureRef.current) return
      bufferRef.current = captureRef.current.value
      scheduleIdleClear()
    }

    function onCaptureKeyDown(event: KeyboardEvent) {
      if (!enabledRef.current) return
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        flush(captureRef.current?.value)
      }
    }

    function onWindowFocus() {
      focusCapture()
    }

    function onPointerDown(event: PointerEvent) {
      if (!enabledRef.current) return
      if (isManualEntryField(event.target)) return
      window.setTimeout(focusCapture, 0)
    }

    if (enabled) {
      window.addEventListener('keydown', onKeyDown, true)
      window.addEventListener('focus', onWindowFocus)
      window.addEventListener('pointerdown', onPointerDown, true)
      input.addEventListener('input', onCaptureInput)
      input.addEventListener('keydown', onCaptureKeyDown)
      focusCapture()
    } else {
      bufferRef.current = ''
      input.value = ''
      clearIdleTimer()
      if (document.activeElement === input) input.blur()
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('focus', onWindowFocus)
      window.removeEventListener('pointerdown', onPointerDown, true)
      input?.removeEventListener('input', onCaptureInput)
      input?.removeEventListener('keydown', onCaptureKeyDown)
      clearIdleTimer()
    }
  }, [enabled])

  useEffect(() => {
    return () => {
      const el = captureRef.current
      if (el?.parentNode) el.parentNode.removeChild(el)
      captureRef.current = null
    }
  }, [])
}
