import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { OutpassRequest } from '@/lib/types'

/** Open a pass detail sheet when navigating from a notification deep link (?pass=uuid). */
export function usePassDeepLink(
  passes: OutpassRequest[],
  loading: boolean,
  onOpenPass: (pass: OutpassRequest) => void,
) {
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const passId = searchParams.get('pass')
    if (!passId || loading) return

    const pass = passes.find((p) => p.id === passId)
    if (!pass) return

    onOpenPass(pass)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('pass')
        return next
      },
      { replace: true },
    )
  }, [searchParams, passes, loading, onOpenPass, setSearchParams])
}
