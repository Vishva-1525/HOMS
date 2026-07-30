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
    message.includes('error loading dynamically imported module') ||
    message.includes('mime type') ||
    message.includes('text/html')
  )
}

async function hardResetApp(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((reg) => reg.unregister()))
    }
  } catch {
    /* ignore */
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } catch {
    /* ignore */
  }

  try {
    // Force the boot gate to purge again on next load.
    localStorage.removeItem('homs-cache-epoch-v4')
    localStorage.removeItem('homs-cache-epoch-v3')
  } catch {
    /* ignore */
  }

  const url = new URL(window.location.href)
  url.searchParams.set('homs_reset', String(Date.now()))
  url.pathname = '/login'
  window.location.replace(url.toString())
}

/**
 * Theme-safe fallback. Never use AuthLoadingScreen / useTheme here.
 */
function RecoveryFallback({
  label,
  detail,
}: {
  label: string
  detail: string | null
}) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24,
        background: '#F5F7FA',
        color: '#0D3F72',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{label}</p>
      {detail && (
        <p
          style={{
            margin: 0,
            maxWidth: 420,
            fontSize: 12,
            lineHeight: 1.4,
            color: '#64748b',
            wordBreak: 'break-word',
          }}
        >
          {detail}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => void hardResetApp()}
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
          Clear cache & open login
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            border: '1px solid #BFDBFE',
            borderRadius: 10,
            background: '#fff',
            color: '#0D3F72',
            fontSize: 14,
            fontWeight: 600,
            padding: '10px 18px',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    </div>
  )
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { recovering: false, message: null }
  private resetTimer: number | null = null

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { recovering: true, message: error.message }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('HOMS AppErrorBoundary:', error)

    // Auto hard-reset for stale chunk / deploy mismatch errors.
    if (isRecoverableError(error)) {
      this.resetTimer = window.setTimeout(() => {
        void hardResetApp()
      }, 600)
    }
  }

  componentWillUnmount() {
    if (this.resetTimer != null) window.clearTimeout(this.resetTimer)
  }

  render() {
    if (this.state.recovering) {
      const recoverable =
        !!this.state.message && isRecoverableError(new Error(this.state.message))
      return (
        <RecoveryFallback
          label={
            recoverable
              ? 'Updating HOMS… clearing old cache'
              : 'Something went wrong'
          }
          detail={this.state.message}
        />
      )
    }

    return this.props.children
  }
}
