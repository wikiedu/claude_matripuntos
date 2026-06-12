// Fase 2 C.3 — ErrorBoundary: un throw en render muestra el fallback en
// lugar de dejar la app en blanco, y el contenido sano se renderiza intacto.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ErrorBoundary, RouteErrorBoundary } from './ErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

beforeEach(() => {
  // React loguea el error capturado en consola — silenciarlo en el test.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renderiza children cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="ok">contenido</div>
      </ErrorBoundary>
    )
    expect(screen.getByTestId('ok')).toBeInTheDocument()
  })

  it('muestra el fallback cuando un hijo lanza en render', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )
    expect(screen.getByText('Algo ha salido mal')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recargar página' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toBeInTheDocument()
  })
})

describe('RouteErrorBoundary', () => {
  it('captura errores dentro de un Router', () => {
    render(
      <MemoryRouter initialEntries={['/analytics']}>
        <RouteErrorBoundary>
          <Bomb />
        </RouteErrorBoundary>
      </MemoryRouter>
    )
    expect(screen.getByText('Algo ha salido mal')).toBeInTheDocument()
  })
})
