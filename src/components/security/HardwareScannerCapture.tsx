import { useEffect, useRef, type FormEvent } from 'react'
import { cn } from '@/lib/utils'

const MIN_SCAN_LENGTH = 4

interface HardwareScannerCaptureProps {
  enabled: boolean
  onScan: (raw: string) => void
  className?: string
}

/**
 * Visible capture field for USB/HID 2D barcode scanners (keyboard wedge).
 * Scanners type into this input and finish with Enter — same path as pasting
 * a UUID and pressing Enter. This is far more reliable than window keydown
 * buffering, which misses many industrial scanners (Unidentified keys, paste
 * injection, focus on buttons, etc.).
 */
export function HardwareScannerCapture({
  enabled,
  onScan,
  className,
}: HardwareScannerCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onScanRef = useRef(onScan)
  const lastScanAtRef = useRef(0)
  const idleSubmitTimerRef = useRef<number | null>(null)

  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) return

    const input = inputRef.current
    if (!input) return

    function focusInput() {
      if (!enabled) return
      const el = inputRef.current
      if (!el) return
      if (document.activeElement === el) return
      // Don't steal focus from the manual lookup form.
      const active = document.activeElement
      if (
        active instanceof HTMLElement
        && active !== el
        && active.dataset.manualScanEntry === 'true'
      ) {
        return
      }
      try {
        el.focus({ preventScroll: true })
      } catch {
        el.focus()
      }
    }

    focusInput()

    const onWindowFocus = () => focusInput()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') focusInput()
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.dataset.manualScanEntry === 'true') return
      if (target.closest('[data-manual-scan-entry="true"]')) return
      window.setTimeout(focusInput, 0)
    }

    window.addEventListener('focus', onWindowFocus)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pointerdown', onPointerDown, true)

    const intervalId = window.setInterval(focusInput, 1500)

    return () => {
      window.removeEventListener('focus', onWindowFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.clearInterval(intervalId)
      if (idleSubmitTimerRef.current != null) {
        window.clearTimeout(idleSubmitTimerRef.current)
      }
    }
  }, [enabled])

  function submitValue(raw: string) {
    const value = raw.trim()
    if (value.length < MIN_SCAN_LENGTH) return

    const now = Date.now()
    if (now - lastScanAtRef.current < 600) return
    lastScanAtRef.current = now

    if (idleSubmitTimerRef.current != null) {
      window.clearTimeout(idleSubmitTimerRef.current)
      idleSubmitTimerRef.current = null
    }

    if (inputRef.current) inputRef.current.value = ''
    onScanRef.current(value)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitValue(inputRef.current?.value ?? '')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      submitValue(event.currentTarget.value)
    }
  }

  function handleInput() {
    if (idleSubmitTimerRef.current != null) {
      window.clearTimeout(idleSubmitTimerRef.current)
    }
    // Many desk scanners omit the Enter suffix. Auto-submit when a full UUID
    // (or long entry code) arrives in a rapid burst.
    idleSubmitTimerRef.current = window.setTimeout(() => {
      const current = inputRef.current?.value.trim() ?? ''
      const looksLikeUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          current,
        )
      const looksLikeEntry = /^[A-Z0-9]{6,10}$/i.test(current)
      if (looksLikeUuid || (looksLikeEntry && current.length >= 6)) {
        submitValue(current)
      }
    }, 120)
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
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="none"
        enterKeyHint="go"
        data-hardware-scanner-capture="true"
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onBlur={() => {
          // Immediately reclaim focus unless the user opened manual entry.
          window.setTimeout(() => {
            const active = document.activeElement
            if (
              active instanceof HTMLElement
              && active.dataset.manualScanEntry === 'true'
            ) {
              return
            }
            inputRef.current?.focus({ preventScroll: true })
          }, 0)
        }}
        placeholder="Waiting for desktop scanner…"
        className="h-11 w-full rounded-xl border border-[#1A5CA0]/35 bg-white px-3 font-mono text-sm text-slate-900 shadow-sm outline-none ring-[#1A5CA0] placeholder:font-sans placeholder:text-slate-400 focus:ring-2"
      />
      <p className="mt-1.5 text-center text-[11px] text-slate-500">
        Scanner types here automatically — keep this field focused
      </p>
    </form>
  )
}
