import { describe, it, expect } from 'vitest'
import { renderWithProviders } from './renderWithProviders'
import { useNavigate } from 'react-router-dom'

describe('smoke', () => {
  it('jsdom + vitest work', () => {
    const el = document.createElement('div')
    el.textContent = 'hola'
    expect(el.textContent).toBe('hola')
  })
})

function Ping() {
  const nav = useNavigate()
  return <button onClick={() => nav('/x')}>ok</button>
}

describe('renderWithProviders', () => {
  it('provides router + query client', () => {
    const { getByRole } = renderWithProviders(<Ping />, { route: '/' })
    expect(getByRole('button', { name: 'ok' })).toBeInTheDocument()
  })
})
