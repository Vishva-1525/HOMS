import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cn } from '@/lib/utils'

const MIN_SCAN_LENGTH = 4
const IDLE_SUBMIT_MS = 220
const INTER_KEY_RESET_MS = 900
const DEDUPE_MS = 700

function isManualEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.dataset.manualScanEntry === 'true') return true
  return Boolean(target.closest('[data-manual-scan-entry="true"]'))
}

/** Map legacy keyCode / code → character for scanners that send Unidentified keys. */
function charFromKeyboardEvent(event: KeyboardEvent): string | null {
  if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') return null
  if (event.key === 'Backspace') return null

  if (event.key.length === 1) return event.key

  // Industrial HID scanners often report key as "Unidentified".
  const code = event.code
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad') && /^Numpad\d$/.test(code)) return code.slice(6)
  if (code.startsWith('Key') && code.length === 4) {
    const letter = code.slice(3)
    return event.shiftKey ? letter : letter.toLowerCase()
  }
  if (code === 'Minus' || code === 'NumpadSubtract') return '-'
  if (code === 'Space') return ' '

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
  // Short gate entry code encoded in the QR
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
 * USB/HID 2D desk scanners (keyboard wedge).
 *
 * Many industrial readers beep and emit keyCode-only / "Unidentified" keydowns
 * that never fill a normal text input. Capture at document level with keyCode
 * fallbacks, idle-submit complete entry codes, and show live receive feedback.
 */
export function HardwareScannerCapture({
  enabled,
  onScan,
  className,
}: HardwareScannerCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onScanRef = useRef(onScan)
  const bufferRef = useRef('')
  const lastKeyAtRef = useRef(0)
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
      if (inputRef.current && inputRef.current.value !== value) {
        inputRef.current.value = value
      }
    }

    function flush(raw?: string) {
      clearIdleTimer()
      const value = (raw ?? bufferRef.current).trim()
      syncDisplay('')
      if (value.length < MIN_SCAN_LENGTH) return

      const now = Date.now()
      if (now - lastScanAtRef.current < DEDUPE_MS) return
      lastScanAtRef.current = now
      onScanRef.current(value)
    }

    function scheduleIdleFlush() {
      clearIdleTimer()
      idleTimerRef.current = window.setTimeout(() => {
        if (looksComplete(bufferRef.current)) {
          flush(bufferRef.current)
        }
      }, IDLE_SUBMIT_MS)
    }

    function appendChar(ch: string) {
      const now = Date.now()
      // Human typing is slow; wedge scanners are bursty. Reset if a long gap.
      if (lastKeyAtRef.current && now - lastKeyAtRef.current > INTER_KEY_RESET_MS) {
        bufferRef.current = ''
      }
      lastKeyAtRef.current = now
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

      // Terminator from scanner suffix (Enter / Tab)
      if (
        event.key === 'Enter'
        || event.key === 'Tab'
        || event.keyCode === 13
        || event.code === 'Enter'
        || event.code === 'NumpadEnter'
        || event.code === 'Tab'
      ) {
        if (bufferRef.current.trim().length >= MIN_SCAN_LENGTH) {
          event.preventDefault()
          event.stopPropagation()
          flush(bufferRef.current)
        }
        return
      }

      if (event.key === 'Escape') {
        syncDisplay('')
        clearIdleTimer()
        return
      }

      if (event.key === 'Backspace' || event.keyCode === 8) {
        event.preventDefault()
        syncDisplay(bufferRef.current.slice(0, -1))
        scheduleIdleFlush()
        return
      }

      const ch = charFromKeyboardEvent(event)
      if (!ch) return

      // Always capture at document level so Unidentified HID keys still build
      // the entry code even when the <input> would ignore them.
      event.preventDefault()
      event.stopPropagation()
      appendChar(ch)
    }

    function onBeforeInput(event: Event) {
      const inputEvent = event as InputEvent
      if (isManualEntryTarget(inputEvent.target)) return
      if (inputEvent.inputType !== 'insertText' && inputEvent.inputType !== 'insertFromPaste') {
        return
      }
      const data = inputEvent.data
      if (!data) return
      inputEvent.preventDefault()
      for (const ch of data) appendChar(ch)
    }

    function onPaste(event: ClipboardEvent) {
      if (isManualEntryTarget(event.target)) return
      const text = event.clipboardData?.getData('text') ?? ''
      if (!text.trim()) return
      event.preventDefault()
      syncDisplay(text)
      flush(text)
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (isManualEntryTarget(target)) return
      window.setTimeout(focusCapture, 0)
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('beforeinput', onBeforeInput, true)
    document.addEventListener('paste', onPaste, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('focus', focusCapture)
    const focusInterval = window.setInterval(focusCapture, 1200)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('beforeinput', onBeforeInput, true)
      document.removeEventListener('paste', onPaste, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('focus', focusCapture)
      window.clearInterval(focusInterval)
      clearIdleTimer()
    }
  }, [enabled])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = (bufferRef.current || displayValue || inputRef.current?.value || '').trim()
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

  const receiving = displayValue.length > 0

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)} autoComplete="off">
      <label className="sr-only" htmlFor="homs-hardware-scanner-input">
        Desk QR scanner input
      </label>
      <input
        id="homs-hardware-scanner-input"
        ref={inputRef}
        type="text"
        name="hardware-scanner"
        value={displayValue}
        readOnly
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="go"
        data-hardware-scanner-capture="true"
        placeholder="Waiting for desk QR scanner…"
        className={cn(
          'h-12 w-full rounded-xl border bg-white px-3 font-mono text-base text-slate-900 shadow-sm outline-none placeholder:font-sans placeholder:text-slate-400 focus:ring-2',
          receiving
            ? 'border-emerald-500 ring-2 ring-emerald-400/40'
            : 'border-[#1A5CA0]/35 ring-[#1A5CA0]',
        )}
      />
      <p
        className={cn(
          'mt-1.5 text-center text-[11px]',
          receiving ? 'font-semibold text-emerald-300' : 'text-slate-500',
        )}
      >
        {receiving
          ? `Receiving scan… ${displayValue.length} characters`
          : 'Keep this window focused — the USB reader types here automatically'}
      </p>
    </form>
  )
}
