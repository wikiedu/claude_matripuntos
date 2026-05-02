import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CookieConsentBanner } from './CookieConsentBanner'
import { clearConsent, readConsent } from '../services/consent'

beforeEach(() => { clearConsent() })

describe('CookieConsentBanner', () => {
  it('aparece si no hay consent', () => {
    render(<CookieConsentBanner />)
    expect(screen.getByTestId('cookie-banner')).toBeInTheDocument()
  })

  it('Aceptar todo persiste analytics:true y oculta el banner', () => {
    const { rerender } = render(<CookieConsentBanner />)
    fireEvent.click(screen.getByTestId('btn-accept-all'))
    expect(readConsent()?.analytics).toBe(true)
    rerender(<CookieConsentBanner />)
    expect(screen.queryByTestId('cookie-banner')).toBeNull()
  })

  it('Solo esenciales persiste analytics:false', () => {
    render(<CookieConsentBanner />)
    fireEvent.click(screen.getByTestId('btn-only-essentials'))
    expect(readConsent()?.analytics).toBe(false)
  })

  it('Personalizar abre modal con toggle de analítica', () => {
    render(<CookieConsentBanner />)
    fireEvent.click(screen.getByTestId('btn-customize'))
    expect(screen.getByTestId('toggle-analytics')).toBeInTheDocument()
  })

  it('Modal personalizar > Guardar respeta el toggle', () => {
    render(<CookieConsentBanner />)
    fireEvent.click(screen.getByTestId('btn-customize'))
    fireEvent.click(screen.getByTestId('toggle-analytics')) // unchecks
    fireEvent.click(screen.getByTestId('btn-save-custom'))
    expect(readConsent()?.analytics).toBe(false)
  })
})
