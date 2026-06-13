// Fase 2 C.3 — ErrorBoundary global. Sin esto, cualquier throw en render
// dejaba la app entera en blanco sin mensaje. Captura el error, lo reporta
// a Sentry (no-op si VITE_SENTRY_DSN no está configurado) y muestra un
// fallback con opciones de recuperación.
import React from 'react'
import { useLocation } from 'react-router-dom'
import { Sentry } from '../lib/sentry'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack)
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack ?? '' } },
    })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    // E.8 Fase 2 — la app es dark-only (tokens fijos en tailwind.config);
    // las clases gray/dark: producían un pantallazo light-mode incoherente.
    return (
      <div className="min-h-screen flex items-center justify-center bg-grad-page px-4">
        <div className="w-full max-w-[500px] text-center">
          <div className="text-5xl mb-4" aria-hidden="true">😵</div>
          <h1 className="text-lg font-semibold text-text-primary mb-2">
            Algo ha salido mal
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            Se ha producido un error inesperado. Puedes recargar la página o
            volver al inicio — tus datos están a salvo.
          </p>
          <div className="flex flex-col gap-2 items-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full max-w-[280px] px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
            >
              Recargar página
            </button>
            <a
              href="/dashboard"
              className="w-full max-w-[280px] px-4 py-2.5 rounded-xl border border-brd-purple text-sm font-medium text-text-primary hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </div>
    )
  }
}

// Wrapper que resetea el boundary al navegar: el key por pathname desmonta
// y remonta el boundary, así un error en /analytics no bloquea /dashboard.
export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
}
