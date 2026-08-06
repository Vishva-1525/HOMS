import { useEffect, useRef, type FormEvent, type RefObject } from 'react'

const MIN_LENGTH = 4
const IDLE_SUBMIT_MS = 250
const DEDUPE_MS = 800

function looksComplete(value: string): boolean {
  const v = value.trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
    return true
  }
  if (/^[0-9a-f]{32}$/i.test(v.replace(/[^0-9a-f]/gi, ''))) return true
  if (/^[A-Z0-9]{6,10}$/i.test(v.replace(/\s+/g, ''))) return true
  if (v.startsWith('{') && v.includes('outpass_id')) return true
  return false
}

/** Reconstruct a character when the wedge reports key === "Unidentified". */
function charFromEvent(event: KeyboardEvent): string | null {
  if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'Escape') return null
  if (event.key === 'Backspace') return null
  if (event.key.length === 1) return event.key

  const { code } = event
  if (code.startsWith('Digit')) return code.slice(5)
  if (/^Numpad\d$/.test(code)) return code.slice(6)
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

interface UseDeskScannerInputOptions {
  enabled: boolean
  onScan: (raw: string) => void
}

export interface DeskScannerInputApi {
  inputRef: RefObject<HTMLInputElement | null>
  handleSubmit: (event: FormEvent) => void
}

/**
 * Production desk-scanner input (USB HID keyboard wedge).
 *
 * 1. Keep a real editable <input> focused — normal wedges type into it.
 * 2. Idle-submit complete entry codes / UUIDs from the input value.
 * 3. Document-level backup for Unidentified HID keys when focus drifts.
 * 4. Enter / Tab submits.
 */
export function useDeskScannerInput({
  enabled,
  onScan,
}: UseDeskScannerInputOptions): DeskScannerInputApi {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const bufferRef = useRef('')
  const lastScanAtRef = useRef(0)
  const idleTimerRef = useRef<number | null>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = ''
      if (inputRef.current) inputRef.current.value = ''
      if (idleTimerRef.current != null) {
        window.clearTimeout(idleTimerRef.current)
        idleTimerRef.current = null
      }
      return
    }

    function clearIdle() {
      if (idleTimerRef.current != null) {
        window.clearTimeout(idleTimerRef.current)
        idleTimerRef.current = null
      }
    }

    function emit(raw: string) {
      clearIdle()
      const value = raw.trim()
      bufferRef.current = ''
      if (inputRef.current) inputRef.current.value = ''
      if (value.length < MIN_LENGTH) return

      const now = Date.now()
      if (now - lastScanAtRef.current < DEDUPE_MS) return
      lastScanAtRef.current = now
      onScanRef.current(value)
    }

    function scheduleIdle() {
      clearIdle()
      idleTimerRef.current = window.setTimeout(() => {
        if (looksComplete(bufferRef.current)) emit(bufferRef.current)
      }, IDLE_SUBMIT_MS)
    }

    function focusInput() {
      const el = inputRef.current
      if (!el) return
      if (document.activeElement === el) return
      try {
        el.focus({ preventScroll: true })
      } catch {
        el.focus()
      }
    }

    function isOurInput(target: EventTarget | null): boolean {
      return target instanceof HTMLElement && target.dataset.deskScannerInput === 'true'
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return

      const terminator =
        event.key === 'Enter'
        || event.key === 'Tab'
        || event.keyCode === 13
        || event.code === 'Enter'
        || event.code === 'NumpadEnter'
        || event.code === 'Tab'

      // Native path: wedge is typing into our focused input — do not preventDefault.
      if (isOurInput(event.target)) {
        if (terminator) {
          const value = inputRef.current?.value || bufferRef.current
          if (value.trim().length >= MIN_LENGTH) {
            event.preventDefault()
            emit(value)
          }
        }
        return
      }

      // Focus drifted. Reconstruct wedge keystrokes at document level.
      if (terminator) {
        if (bufferRef.current.trim().length >= MIN_LENGTH) {
          event.preventDefault()
          event.stopPropagation()
          emit(bufferRef.current)
        }
        return
      }

      if (event.key === 'Escape') {
        bufferRef.current = ''
        if (inputRef.current) inputRef.current.value = ''
        clearIdle()
        return
      }

      if (event.key === 'Backspace' || event.keyCode === 8) {
        event.preventDefault()
        bufferRef.current = bufferRef.current.slice(0, -1)
        if (inputRef.current) inputRef.current.value = bufferRef.current
        scheduleIdle()
        return
      }

      const ch = charFromEvent(event)
      if (!ch) return
      event.preventDefault()
      event.stopPropagation()
      bufferRef.current += ch
      if (inputRef.current) inputRef.current.value = bufferRef.current
      scheduleIdle()
    }

    function onInput() {
      const value = inputRef.current?.value ?? ''
      bufferRef.current = value
      scheduleIdle()
    }

    function onPaste(event: ClipboardEvent) {
      const text = event.clipboardData?.getData('text') ?? ''
      if (!text.trim()) return
      if (isOurInput(event.target)) return // native paste + onInput idle submit
      event.preventDefault()
      emit(text)
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.closest('button, a, [role="button"]')) return
      window.setTimeout(focusInput, 0)
    }

    focusInput()

    const input = inputRef.current
    input?.addEventListener('input', onInput)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('paste', onPaste, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('focus', focusInput)
    const focusInterval = window.setInterval(focusInput, 1200)

    return () => {
      input?.removeEventListener('input', onInput)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('paste', onPaste, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('focus', focusInput)
      window.clearInterval(focusInterval)
      clearIdle()
    }
  }, [enabled])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const value = (inputRef.current?.value || bufferRef.current).trim()
    bufferRef.current = ''
    if (inputRef.current) inputRef.current.value = ''
    if (value.length < MIN_LENGTH) return
    const now = Date.now()
    if (now - lastScanAtRef.current < DEDUPE_MS) return
    lastScanAtRef.current = now
    onScanRef.current(value)
  }

  return { inputRef, handleSubmit }
}
