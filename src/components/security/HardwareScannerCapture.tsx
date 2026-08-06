import { useEffect, useRef, type FormEvent } from 'react'
import { normalizeCompactUuid } from '@/lib/pass-qr'
import { cn } from '@/lib/utils'

const MIN_SCAN_LENGTH = 4
const IDLE_SUBMIT_MS = 300
const DEDUPE_MS = 900

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

function isManualEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.dataset.manualScanEntry === 'true') return true
  return Boolean(target.closest('[data-manual-scan-entry="true"]'))
}

function isCaptureInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.dataset.hardwareScannerCapture === 'true'
}

function extractScanPayload(raw: string): string | null {
  const trimmed = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim()
  if (!trimmed) return null

  const compact = trimmed.replace(/\s+/g, '')
  if (/^[A-Z0-9]{6,10}$/i.test(compact)) return compact.toUpperCase()

  const uuid = trimmed.match(UUID_RE)
  if (uuid) return uuid[0]

  const fromCompact = normalizeCompactUuid(compact)
  if (fromCompact) return fromCompact

  if (trimmed.startsWith('{') && trimmed.includes('outpass_id')) return trimmed

  return null
}

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

interface HardwareScannerCaptureProps {
  enabled: boolean
  onScan: (raw: string) => void
  className?: string
}

/**
 * Brontix X3 (and similar desk 2D platforms) act as a USB HID keyboard wedge:
 * they type the decoded QR payload into the focused field and usually end with Enter.
 * They do not expose a live video stream to the browser.
 */
export function HardwareScannerCapture({
  enabled,
  onScan,
  className,
}: HardwareScannerCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onScanRef = useRef(onScan)
  const backupBufferRef = useRef('')
  const lastScanAtRef = useRef(0)
  const idleTimerRef = useRef<number | null>(null)

  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) {
      backupBufferRef.current = ''
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    function clearIdleTimer() {
      if (idleTimerRef.current != null) {
        window.clearTimeout(idleTimerRef.current)
        idleTimerRef.current = null
      }
    }

    function submit(raw: string) {
      const payload = extractScanPayload(raw) ?? raw.trim()
      if (payload.length < MIN_SCAN_LENGTH) return

      const now = Date.now()
      if (now - lastScanAtRef.current < DEDUPE_MS) return
      lastScanAtRef.current = now

      clearIdleTimer()
      backupBufferRef.current = ''
      if (inputRef.current) inputRef.current.value = ''
      onScanRef.current(payload)
    }

    function scheduleUuidIdleSubmit(raw: string) {
      clearIdleTimer()
      idleTimerRef.current = window.setTimeout(() => {
        const uuid = raw.match(UUID_RE)
        if (uuid) submit(uuid[0])
      }, IDLE_SUBMIT_MS)
    }

    function focusCapture() {
      const el = inputRef.current
      if (!el) return
      if (isManualEntryTarget(document.activeElement)) return
      if (document.activeElement === el) return
      try {
        el.focus({ preventScroll: true })
      } catch {
        el.focus()
      }
    }

    focusCapture()

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isManualEntryTarget(event.target)) return

      // Native typing into the capture field — do not preventDefault.
      if (isCaptureInput(event.target)) {
        if (event.key === 'Enter' || event.key === 'Tab' || event.keyCode === 13) {
          const value = inputRef.current?.value ?? ''
          if (value.trim().length >= MIN_SCAN_LENGTH) {
            event.preventDefault()
            submit(value)
          }
        }
        return
      }

      // Focus drifted to a button/panel — buffer wedge keystrokes.
      if (event.key === 'Enter' || event.key === 'Tab' || event.keyCode === 13) {
        if (backupBufferRef.current.trim().length >= MIN_SCAN_LENGTH) {
          event.preventDefault()
          submit(backupBufferRef.current)
        }
        return
      }

      if (event.key === 'Escape') {
        backupBufferRef.current = ''
        clearIdleTimer()
        return
      }

      if (event.key === 'Backspace' || event.keyCode === 8) {
        backupBufferRef.current = backupBufferRef.current.slice(0, -1)
        return
      }

      const ch = charFromKeyboardEvent(event)
      if (!ch) return
      event.preventDefault()
      backupBufferRef.current += ch
      scheduleUuidIdleSubmit(backupBufferRef.current)
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (isManualEntryTarget(target)) return
      window.setTimeout(focusCapture, 0)
    }

    document.addEventListener('keydown', onDocumentKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('focus', focusCapture)

    return () => {
      document.removeEventListener('keydown', onDocumentKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('focus', focusCapture)
      clearIdleTimer()
    }
  }, [enabled])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = inputRef.current?.value ?? ''
    if (value.trim().length < MIN_SCAN_LENGTH) return

    const now = Date.now()
    if (now - lastScanAtRef.current < DEDUPE_MS) return
    lastScanAtRef.current = now

    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    backupBufferRef.current = ''
    if (inputRef.current) inputRef.current.value = ''
    onScan(extractScanPayload(value) ?? value.trim())
  }

  function handleInput() {
    const value = inputRef.current?.value ?? ''
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current)
    }
    idleTimerRef.current = window.setTimeout(() => {
      const current = inputRef.current?.value ?? value
      const uuid = current.match(UUID_RE)
      if (!uuid) return
      const now = Date.now()
      if (now - lastScanAtRef.current < DEDUPE_MS) return
      lastScanAtRef.current = now
      backupBufferRef.current = ''
      if (inputRef.current) inputRef.current.value = ''
      onScanRef.current(uuid[0])
    }, IDLE_SUBMIT_MS)
  }

  if (!enabled) return null

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
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="go"
        data-hardware-scanner-capture="true"
        onInput={handleInput}
        onBlur={() => {
          window.setTimeout(() => {
            if (!enabled) return
            if (isManualEntryTarget(document.activeElement)) return
            inputRef.current?.focus({ preventScroll: true })
          }, 0)
        }}
        placeholder="Waiting for desk QR scanner…"
        className="h-11 w-full rounded-xl border border-[#1A5CA0]/35 bg-white px-3 font-mono text-sm text-slate-900 shadow-sm outline-none ring-[#1A5CA0] placeholder:font-sans placeholder:text-slate-400 focus:ring-2"
      />
      <p className="mt-1.5 text-center text-[11px] text-slate-500">
        Scan the pass QR — the USB reader types here automatically
      </p>
    </form>
  )
}
