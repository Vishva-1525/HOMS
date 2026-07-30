import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { EnvSetupScreen } from '@/components/EnvSetupScreen'
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { isSupabaseConfigured } from '@/lib/env'
import App from './App.tsx'

const root = document.getElementById('root')!

if (!isSupabaseConfigured()) {
  createRoot(root).render(
    <StrictMode>
      <EnvSetupScreen />
    </StrictMode>,
  )
} else {
  createRoot(root).render(
    <StrictMode>
      <ThemeProvider>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </ThemeProvider>
    </StrictMode>,
  )
}
