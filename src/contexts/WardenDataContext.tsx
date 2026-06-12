import { createContext, useContext, type ReactNode } from 'react'
import { useWardenData } from '@/hooks/warden/useWardenData'

type WardenDataContextValue = ReturnType<typeof useWardenData>

const WardenDataContext = createContext<WardenDataContextValue | null>(null)

export function WardenDataProvider({ children }: { children: ReactNode }) {
  const value = useWardenData()
  return <WardenDataContext.Provider value={value}>{children}</WardenDataContext.Provider>
}

export function useWardenDataContext(): WardenDataContextValue {
  const context = useContext(WardenDataContext)
  if (!context) {
    throw new Error('useWardenDataContext must be used within WardenDataProvider')
  }
  return context
}
