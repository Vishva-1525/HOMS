import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cn } from '@/lib/utils'

const MIN_SCAN_LENGTH = 4
const IDLE_SUBMIT_MS = 180

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
  if (code.startsWith('Numpad') && code.length === 7) return code.slice(6)
  if (code.startsWith('Key')) {
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
  if (/^[A-Z0-9]{6,10}$/i.test(v)) return true
  // JSON QR payloads
  if (v.startsWith('{') && v.endsWith('}') && v.includes('outpass_id')) return true
  return false
}

interface HardwareScannerCaptureProps {
  enabled: boolean
  onScan: (raw: string) => void
  className?: string
}

/**
 * Accept USB/HID 2D barcode scanners (keyboard wedge).
 *
 * Uses BOTH:
 * 1. A visible input (for scanners that type normally)
 * 2. Document-level keydown capture with keyCode fallbacks (for scanners
 *    that send Unidentified keys and never fill an <input>)
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
      return
    }

    const input = inputRef.current
    input?.focus({ preventScroll: true })

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
      if (now - lastScanAtRef.current < 500) return
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
      if (lastKeyAtRef.current && now - lastKeyAtRef.current > 800) {
        bufferRef.current = ''
      }
      lastKeyAtRef.current = now
      syncDisplay(bufferRef.current + ch)
      scheduleIdleFlush()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!enabled) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isManualEntryTarget(event.target)) return

      // Terminator
      if (event.key === 'Enter' || event.key === 'Tab' || event.keyCode === 13) {
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
        syncDisplay(bufferRef.current.slice(0, -1))
        scheduleIdleFlush()
        return
      }

      const ch = charFromKeyboardEvent(event)
      if (!ch) return

      // Always capture wedge characters at document level so Unidentified
      // key events still build the pass id even when <input> ignores them.
      event.preventDefault()
      event.stopPropagation()
      appendChar(ch)
    }

    // Some scanners inject via beforeinput / paste instead of keydown.
    function onBeforeInput(event: InputEvent) {
      if (!enabled) return
      if (isManualEntryTarget(event.target)) return
      if (event.inputType !== 'insertText' && event.inputType !== 'insertFromPaste') return
      const data = event.data
      if (!data) return
      event.preventDefault()
      for (const ch of data) appendChar(ch)
    }

    function onPaste(event: ClipboardEvent) {
      if (!enabled) return
      if (isManualEntryTarget(event.target)) return
      const text = event.clipboardData?.getData('text') ?? ''
      if (!text.trim()) return
      event.preventDefault()
      syncDisplay(text)
      flush(text)
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('beforeinput', onBeforeInput as EventListener, true)
    document.addEventListener('paste', onPaste, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('beforeinput', onBeforeInput as EventListener, true)
      document.removeEventListener('paste', onPaste, true)
      clearIdleTimer()
    }
  }, [enabled])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = (inputRef.current?.value || bufferRef.current || displayValue).trim()
    if (value.length < MIN_SCAN_LENGTH) return
    const now = Date.now()
    if (now - lastScanAtRef.current < 500) return
    lastScanAtRef.current = now
    bufferRef.current = ''
    setDisplayValue('')
    if (inputRef.current) inputRef.current.value = ''
    onScanRef.current(value)
  }

  if (!enabled) return null

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('w-full', className)}
      autoComplete="off"
    >
      <label className="sr-only" htmlFor="homs-hardware-scanner-input">
        Hardware QR scanner input
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
        data-hardware-scanner-capture="true"
        placeholder="Waiting for desktop scanner…"
        onFocus={() => {
          // Keep selection at end so wedge append looks natural if editable later
        }}
        className="h-11 w-full rounded-xl border border-[#1A5CA0]/35 bg-white px-3 font-mono text-sm text-slate-900 shadow-sm outline-none ring-[#1A5CA0] placeholder:font-sans placeholder:text-slate-400 focus:ring-2"
      />
      <p className="mt-1.5 text-center text-[11px] text-slate-500">
        {displayValue
          ? `Receiving scan… (${displayValue.length} chars)`
          : 'Point the desk scanner at the pass QR — this field fills automatically'}
      </p>
    </form>
  )
}
