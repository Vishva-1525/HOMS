import { Component, type ErrorInfo, type ReactNode } from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  recovering: boolean
  message: string | null
}

function isRecoverableError(error: Error): boolean {
  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  )
}

/**
 * Must NOT render AuthLoadingScreen / AuthBackground here.
 * This boundary sits outside ThemeProvider in main.tsx; using useTheme()
 * in the fallback caused an infinite crash → blank white page.
 */
function RecoveryFallback({ label }: { label: string }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        background: '#F5F7FA',
        color: '#0D3F72',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{label}</p>
      <button
        type="button"
        onClick={() => window.location.assign('/login')}
        style={{
          border: 'none',
          borderRadius: 10,
          background: '#1A5CA0',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          padding: '10px 18px',
          cursor: 'pointer',
        }}
      >
        Go to login
      </button>
    </div>
  )
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { recovering: false, message: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { recovering: true, message: error.message }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('HOMS AppErrorBoundary:', error)

    if (isRecoverableError(error)) {
      window.setTimeout(() => window.location.reload(), 400)
      return
    }

    window.setTimeout(() => {
      window.location.replace('/login')
    }, 1200)
  }

  render() {
    if (this.state.recovering) {
      return (
        <RecoveryFallback
          label={
            this.state.message && isRecoverableError(new Error(this.state.message))
              ? 'Updating app…'
              : 'Something went wrong. Reloading…'
          }
        />
      )
    }

    return this.props.children
  }
}
