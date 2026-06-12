import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { EnvSetupScreen } from '@/components/EnvSetupScreen'
import { isSupabaseConfigured } from '@/lib/env'

const root = document.getElementById('root')!

if (!isSupabaseConfigured()) {
  createRoot(root).render(
    <StrictMode>
      <EnvSetupScreen />
    </StrictMode>,
  )
} else {
  const { default: App } = await import('./App.tsx')
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
