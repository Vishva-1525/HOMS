import { createContext, useContext, type ReactNode } from 'react'
import { useSecurityOffline } from '@/hooks/security/useSecurityOffline'

type SecurityOfflineContextValue = ReturnType<typeof useSecurityOffline>

const SecurityOfflineContext = createContext<SecurityOfflineContextValue | null>(null)

export function SecurityOfflineProvider({ children }: { children: ReactNode }) {
  const value = useSecurityOffline()
  return (
    <SecurityOfflineContext.Provider value={value}>{children}</SecurityOfflineContext.Provider>
  )
}

export function useSecurityOfflineContext(): SecurityOfflineContextValue {
  const ctx = useContext(SecurityOfflineContext)
  if (!ctx) {
    throw new Error('useSecurityOfflineContext must be used within SecurityOfflineProvider')
  }
  return ctx
}
