import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cn } from '@/lib/utils'

const MIN_SCAN_LENGTH = 4
const IDLE_SUBMIT_MS = 280
const DEDUPE_MS = 800

function isManualEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.dataset.manualScanEntry === 'true') return true
  return Boolean(target.closest('[data-manual-scan-entry="true"]'))
}

function isCaptureInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.dataset.hardwareScannerCapture === 'true'
}

/** Map legacy keyCode / code → character for scanners that send Unidentified keys. */
function charFromKeyboardEvent(event: KeyboardEvent): string | null {
  if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') return null
  if (event.key === 'Backspace') return null
  if (event.key.length === 1) return event.key

  const code = event.code
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad') && /^Numpad\d$/.test(code)) return code.slice(6)
  if (code.startsWith('Key') && code.length === 4) {
    const letter = code.slice(3)
    return event.shiftKey ? letter : letter.toLowerCase()
  }
  if (code === 'Minus' || code === 'NumpadSubtract') return '-'

  const keyCode = event.keyCode || event.which
  if (keyCode >= 48 && keyCode <= 57) return String.fromCharCode(keyCode)
  if (keyCode >= 96 && keyCode <= 105) return String.fromCharCode(keyCode - 48)
  if (keyCode >= 65 && keyCode <= 90) {
    const letter = String.fromCharCode(keyCode)
    return event.shiftKey ? letter : letter.toLowerCase()
  }
  if (keyCode === 189 || keyCode === 109) return '-'
  return null
}

function looksComplete(value: string): boolean {
  const v = value.trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
    return true
  }
  if (/^[0-9a-f]{32}$/i.test(v.replace(/[^0-9a-f]/gi, ''))) return true
  if (/^[A-Z0-9]{6,10}$/i.test(v.replace(/\s+/g, ''))) return true
  if (v.startsWith('{') && v.endsWith('}') && v.includes('outpass_id')) return true
  return false
}

interface HardwareScannerCaptureProps {
  enabled: boolean
  onScan: (raw: string) => void
  className?: string
}

/**
 * Desk USB HID wedge capture + editable field for paste/manual typing.
 */
export function HardwareScannerCapture({
  enabled,
  onScan,
  className,
}: HardwareScannerCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onScanRef = useRef(onScan)
  const bufferRef = useRef('')
  const lastScanAtRef = useRef(0)
  const idleTimerRef = useRef<number | null>(null)
  const [displayValue, setDisplayValue] = useState('')

  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = ''
      setDisplayValue('')
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

    function syncDisplay(value: string) {
      bufferRef.current = value
      setDisplayValue(value)
    }

    function flush(raw?: string) {
      clearIdleTimer()
      const value = (raw ?? bufferRef.current).trim()
      syncDisplay('')
      if (inputRef.current) inputRef.current.value = ''
      if (value.length < MIN_SCAN_LENGTH) return

      const now = Date.now()
      if (now - lastScanAtRef.current < DEDUPE_MS) return
      lastScanAtRef.current = now
      onScanRef.current(value)
    }

    function scheduleIdleFlush() {
      clearIdleTimer()
      idleTimerRef.current = window.setTimeout(() => {
        if (looksComplete(bufferRef.current)) flush(bufferRef.current)
      }, IDLE_SUBMIT_MS)
    }

    function appendChar(ch: string) {
      syncDisplay(bufferRef.current + ch)
      scheduleIdleFlush()
    }

    function focusCapture() {
      const el = inputRef.current
      if (!el) return
      if (isManualEntryTarget(document.activeElement)) return
      try {
        el.focus({ preventScroll: true })
      } catch {
        el.focus()
      }
    }

    focusCapture()

    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isManualEntryTarget(event.target)) return

      if (
        event.key === 'Enter'
        || event.key === 'Tab'
        || event.keyCode === 13
        || event.code === 'Enter'
        || event.code === 'NumpadEnter'
        || event.code === 'Tab'
      ) {
        const value = isCaptureInput(event.target)
          ? (inputRef.current?.value || bufferRef.current)
          : bufferRef.current
        if (value.trim().length >= MIN_SCAN_LENGTH) {
          event.preventDefault()
          event.stopPropagation()
          flush(value)
        }
        return
      }

      if (event.key === 'Escape') {
        syncDisplay('')
        if (inputRef.current) inputRef.current.value = ''
        clearIdleTimer()
        return
      }

      // Native typing into the capture field — let the browser update the input,
      // then mirror into the buffer on input events.
      if (isCaptureInput(event.target)) return

      if (event.key === 'Backspace' || event.keyCode === 8) {
        event.preventDefault()
        syncDisplay(bufferRef.current.slice(0, -1))
        scheduleIdleFlush()
        return
      }

      const ch = charFromKeyboardEvent(event)
      if (!ch) return
      event.preventDefault()
      event.stopPropagation()
      appendChar(ch)
    }

    function onPaste(event: ClipboardEvent) {
      if (isManualEntryTarget(event.target)) return
      const text = event.clipboardData?.getData('text') ?? ''
      if (!text.trim()) return
      event.preventDefault()
      flush(text)
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (isManualEntryTarget(target)) return
      if (target.closest('button, a, [role="button"]')) return
      window.setTimeout(focusCapture, 0)
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('paste', onPaste, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('focus', focusCapture)
    const focusInterval = window.setInterval(focusCapture, 2000)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('paste', onPaste, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('focus', focusCapture)
      window.clearInterval(focusInterval)
      clearIdleTimer()
    }
  }, [enabled])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = (inputRef.current?.value || bufferRef.current || displayValue).trim()
    if (value.length < MIN_SCAN_LENGTH) return
    const now = Date.now()
    if (now - lastScanAtRef.current < DEDUPE_MS) return
    lastScanAtRef.current = now
    bufferRef.current = ''
    setDisplayValue('')
    if (inputRef.current) inputRef.current.value = ''
    onScanRef.current(value)
  }

  if (!enabled) return null

  return (
    <form onSubmit={handleSubmit} className={cn('w-full space-y-2', className)} autoComplete="off">
      <label className="sr-only" htmlFor="homs-hardware-scanner-input">
        Desk QR scanner / entry code
      </label>
      <input
        id="homs-hardware-scanner-input"
        ref={inputRef}
        type="text"
        name="hardware-scanner"
        defaultValue=""
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="go"
        data-hardware-scanner-capture="true"
        placeholder="Scan QR or type entry code, then Enter"
        onInput={(event) => {
          const value = (event.target as HTMLInputElement).value
          bufferRef.current = value
          setDisplayValue(value)
          if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current)
          idleTimerRef.current = window.setTimeout(() => {
            if (looksComplete(bufferRef.current)) {
              const now = Date.now()
              if (now - lastScanAtRef.current < DEDUPE_MS) return
              lastScanAtRef.current = now
              const payload = bufferRef.current.trim()
              bufferRef.current = ''
              setDisplayValue('')
              if (inputRef.current) inputRef.current.value = ''
              onScanRef.current(payload)
            }
          }, IDLE_SUBMIT_MS)
        }}
        className="h-12 w-full rounded-xl border border-[#1A5CA0]/35 bg-white px-3 font-mono text-base text-slate-900 shadow-sm outline-none ring-[#1A5CA0] placeholder:font-sans placeholder:text-slate-400 focus:ring-2"
      />
      <button
        type="submit"
        className="h-11 w-full rounded-xl bg-[#1A5CA0] text-sm font-bold text-white active:scale-[0.99]"
      >
        Check pass
      </button>
      <p className="text-center text-[11px] text-slate-500">
        USB desk scanner types here automatically — or type/paste the entry code and press Check pass
      </p>
    </form>
  )
}
