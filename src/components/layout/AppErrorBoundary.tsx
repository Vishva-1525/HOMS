import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  recovering: boolean
}

function isRecoverableError(error: Error): boolean {
  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('importing a module script failed')
  )
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { recovering: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { recovering: true }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (isRecoverableError(error)) {
      window.setTimeout(() => window.location.reload(), 300)
      return
    }

    window.setTimeout(() => {
      window.location.replace('/')
    }, 1200)
  }

  render() {
    if (this.state.recovering) {
      return <AuthLoadingScreen label="Reloading app…" />
    }

    return this.props.children
  }
}
