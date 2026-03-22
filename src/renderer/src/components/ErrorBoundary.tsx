import { Component, type ReactNode, type ErrorInfo } from 'react'
import { logger } from '@/utils/logger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error(`Unhandled React error: ${error.message}${info.componentStack ? ` — ${info.componentStack.split('\n')[1]?.trim()}` : ''}`)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', padding: '2rem',
          textAlign: 'center', background: '#1a1a2e', color: '#e0e0e0',
        }}>
          <h2 style={{ marginBottom: '1rem', color: '#ff6b6b' }}>Something went wrong</h2>
          <p style={{ marginBottom: '1.5rem', opacity: 0.7, maxWidth: 400, lineHeight: 1.6 }}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none',
              background: '#4a90e2', color: '#fff', cursor: 'pointer', fontSize: '1rem',
            }}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
