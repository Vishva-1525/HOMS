import { useEffect, useState } from 'react'

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
}

export function useCountdown(targetIso: string): string {
  const [remaining, setRemaining] = useState(() =>
    formatCountdown(new Date(targetIso).getTime() - Date.now()),
  )

  useEffect(() => {
    const tick = () => {
      setRemaining(formatCountdown(new Date(targetIso).getTime() - Date.now()))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetIso])

  return remaining
}
