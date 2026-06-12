import { useEffect, useState } from 'react'

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
}

export function useCountdown(targetIso: string): string {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(targetIso).getTime() - Date.now()
    return diff > 0 ? formatCountdown(diff) : `+${formatCountdown(diff)}`
  })

  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now()
      setRemaining(diff > 0 ? formatCountdown(diff) : `+${formatCountdown(diff)}`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetIso])

  return remaining
}
