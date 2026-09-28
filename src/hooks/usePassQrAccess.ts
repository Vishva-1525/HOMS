import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchQrAvailabilityMinutes } from '@/hooks/useQrAvailabilityMinutes'
import { isQrEligibleStatus } from '@/lib/pass-filters'
import { DEFAULT_QR_AVAILABILITY_MINUTES, getQrAvailabilityOpensAt, isQrAvailable } from '@/lib/qr-availability'
import { anchorServerClock, serverNow } from '@/lib/server-clock'
import { supabase } from '@/lib/supabase'
import type { OutpassRequest } from '@/lib/types'

export type PassQrAccessState = 'checking' | 'ready' | 'waiting' | 'closed'

export interface PassQrAccess {
  state: PassQrAccessState
  opensAt: Date | null
  msRemaining: number
  windowMinutes: number
}

const CLOSED_KEY = 'homs.pv'
const RECHECK_MS = 60_000

function readClosed(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function rememberClosed(passId: string) {
  try {
    const ids = readClosed()
    if (ids.includes(passId)) return
    localStorage.setItem(CLOSED_KEY, JSON.stringify([...ids, passId].slice(-200)))
  } catch {
    /* storage unavailable */
  }
}

function localAccess(pass: OutpassRequest, windowMinutes: number): { state: PassQrAccessState; opensAt: Date | null } {
  if (readClosed().includes(pass.id)) return { state: 'closed', opensAt: null }
  const now = serverNow()
  if (now > new Date(pass.return_by).getTime()) return { state: 'closed', opensAt: null }
  if (isQrAvailable(pass, windowMinutes, now)) return { state: 'ready', opensAt: null }
  return { state: 'waiting', opensAt: getQrAvailabilityOpensAt(pass, windowMinutes) }
}

export function usePassQrAccess(pass: OutpassRequest): PassQrAccess {
  const eligible = isQrEligibleStatus(pass.status)
  const [state, setState] = useState<PassQrAccessState>(eligible ? 'checking' : 'closed')
  const [opensAt, setOpensAt] = useState<Date | null>(null)
  const [windowMinutes, setWindowMinutes] = useState(DEFAULT_QR_AVAILABILITY_MINUTES)
  const [now, setNow] = useState(() => serverNow())
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    if (!eligible) return

    const id = ++requestId.current
    const minutes = await fetchQrAvailabilityMinutes()
    if (id !== requestId.current) return
    setWindowMinutes(minutes)

    try {
      const { data, error } = await supabase.rpc('get_pass_view', { p_outpass_id: pass.id })
      if (id !== requestId.current) return
      if (error || !data) throw error ?? new Error('empty')

      const result = data as { now?: string; state?: string; opens_at?: string | null }
      if (result.now) anchorServerClock(result.now)

      const next: PassQrAccessState =
        result.state === 'ready' || result.state === 'waiting' ? result.state : 'closed'
      if (next === 'closed') rememberClosed(pass.id)
      setOpensAt(next === 'waiting' && result.opens_at ? new Date(result.opens_at) : null)
      setState(next)
    } catch {
      if (id !== requestId.current) return
      const fallback = localAccess(pass, minutes)
      setOpensAt(fallback.opensAt)
      setState(fallback.state)
    }
    setNow(serverNow())
  }, [eligible, pass])

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), RECHECK_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      requestId.current += 1
      window.clearTimeout(initial)
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  useEffect(() => {
    if (state !== 'waiting' || !opensAt) return
    const tick = window.setInterval(() => {
      const t = serverNow()
      setNow(t)
      if (t >= opensAt.getTime()) {
        window.clearInterval(tick)
        void refresh()
      }
    }, 1000)
    return () => window.clearInterval(tick)
  }, [state, opensAt, refresh])

  return {
    state: eligible ? state : 'closed',
    opensAt,
    msRemaining: opensAt ? Math.max(0, opensAt.getTime() - now) : 0,
    windowMinutes,
  }
}
