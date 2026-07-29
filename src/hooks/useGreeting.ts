import { useCallback, useEffect, useState } from 'react'
import { getGreeting } from '@/lib/outpass'

/** Time-based greeting that refreshes on mount and when the app returns to focus. */
export function useGreeting(): string {
  const [greeting, setGreeting] = useState(getGreeting)

  const refresh = useCallback(() => {
    setGreeting(getGreeting())
  }, [])

  useEffect(() => {
    refresh()

    function onVisible() {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  return greeting
}
