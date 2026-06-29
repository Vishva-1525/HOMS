import { AppShell } from '@/components/layout/AppShell'
import { useWardenDataContext } from '@/contexts/WardenDataContext'

export function WardenShell() {
  const { pendingCount, pendingExtensionsCount } = useWardenDataContext()

  function getNavBadgeCount(path: string): number {
    if (path === '/warden/pending') return pendingCount
    if (path === '/warden/extensions') return pendingExtensionsCount
    return 0
  }

  return <AppShell getNavBadgeCount={getNavBadgeCount} />
}
