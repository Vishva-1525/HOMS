import { useEffect, useState } from 'react'
import { fetchQrAvailabilityMinutes } from '@/hooks/useQrAvailabilityMinutes'
import {
  DEFAULT_QR_AVAILABILITY_MINUTES,
  formatCountdownDuration,
  formatQrOpensAt,
  getMsUntilQrUnlock,
  getQrAvailabilityOpensAt,
  isQrAvailable,
} from '@/lib/qr-availability'
import { isMultiDailyScanPass } from '@/lib/pass-multi-scan'
import type { OutpassRequest } from '@/lib/types'

export interface QrUnlockCountdown {
  windowMinutes: number
  ready: boolean
  /** Live remaining until unlock, e.g. "29:58" or "1:05:03" */
  remainingLabel: string
  opensAtLabel: string
  opensAt: Date | null
  msRemaining: number
}

/**
 * Live countdown until the pass QR unlocks (default 30 min before departure).
 * Internship / multi-daily passes are treated as ready immediately when approved.
 */
export function useQrUnlockCountdown(pass: OutpassRequest | null): QrUnlockCountdown {
  const [windowMinutes, setWindowMinutes] = useState(DEFAULT_QR_AVAILABILITY_MINUTES)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    fetchQrAvailabilityMinutes().then(setWindowMinutes)
  }, [])

  useEffect(() => {
    if (!pass) return
    if (isMultiDailyScanPass(pass)) return

    const tick = () => {
      const t = Date.now()
      setNow(t)
      if (isQrAvailable(pass, windowMinutes, t)) {
        window.clearInterval(id)
      }
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [pass, windowMinutes])

  if (!pass) {
    return {
      windowMinutes,
      ready: false,
      remainingLabel: '0:00',
      opensAtLabel: '',
      opensAt: null,
      msRemaining: 0,
    }
  }

  const ready = isQrAvailable(pass, windowMinutes, now)
  const msRemaining = getMsUntilQrUnlock(pass, windowMinutes, now)
  const opensAt = getQrAvailabilityOpensAt(pass, windowMinutes)

  return {
    windowMinutes,
    ready,
    remainingLabel: formatCountdownDuration(msRemaining),
    opensAtLabel: formatQrOpensAt(pass, windowMinutes),
    opensAt,
    msRemaining,
  }
}
