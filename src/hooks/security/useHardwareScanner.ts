import { useEffect, useRef } from 'react'

/**
 * Desktop 2D barcode/QR scanners act as a keyboard wedge:
 * they type the decoded payload quickly and finish with Enter (or Tab/Return).
 *
 * Capture strategy:
 * 1. Keep a dedicated off-screen input focused while scanning is enabled
 * 2. Also listen on window as a backup when focus drifts to buttons/nav
 */
const IDLE_CLEAR_MS = 1200
const MIN_SCAN_LENGTH = 4

function isManualEntryField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.dataset.hardwareScannerCapture === 'true') return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function appendKey(buffer: string, key: string): string {
  if (key === 'Enter' || key === 'Tab' || key === 'Escape') return buffer
  if (key.length !== 1) return buffer
  return buffer + key
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
      // Keep it focusable but invisible and out of the layout flow.
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
      const fromArg = raw?.trim() ?? ''
      const fromBuffer = bufferRef.current.trim()
      const fromInput = captureRef.current?.value.trim() ?? ''
      const value = fromArg || fromBuffer || fromInput
      bufferRef.current = ''
      if (captureRef.current) captureRef.current.value = ''
      if (value.length >= MIN_SCAN_LENGTH) {
        onScanRef.current(value)
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

      // Never steal characters from the manual entry form.
      if (isManualEntryField(event.target)) return

      // Keep capture field focused for the next scan burst.
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
        scheduleIdleClear()
        return
      }

      if (event.key.length === 1) {
        // Prevent focused buttons from eating Enter later / browser find-as-you-type.
        event.preventDefault()
        bufferRef.current = appendKey(bufferRef.current, event.key)
        if (captureRef.current) {
          captureRef.current.value = bufferRef.current
        }
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
      // Reclaim focus after clicking buttons / empty panel areas.
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
