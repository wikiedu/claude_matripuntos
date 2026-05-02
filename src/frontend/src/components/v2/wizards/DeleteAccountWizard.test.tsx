import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteAccountWizard } from './DeleteAccountWizard'

describe('DeleteAccountWizard', () => {
  it('no renderiza si !isOpen', () => {
    render(<DeleteAccountWizard isOpen={false} onClose={() => {}} onDeleted={() => {}} />)
    expect(screen.queryByTestId('delete-account-wizard')).toBeNull()
  })

  it('renderiza paso 1 educativo al abrir', () => {
    render(<DeleteAccountWizard isOpen onClose={() => {}} onDeleted={() => {}} />)
    expect(screen.getByText(/Eliminar cuenta/)).toBeInTheDocument()
    expect(screen.getByTestId('btn-step1-continue')).toBeInTheDocument()
  })

  it('avanza de paso 1 a paso 2 al pulsar Continuar', () => {
    render(<DeleteAccountWizard isOpen onClose={() => {}} onDeleted={() => {}} />)
    fireEvent.click(screen.getByTestId('btn-step1-continue'))
    expect(screen.getByTestId('input-password')).toBeInTheDocument()
  })

  it('Cancelar en paso 1 dispara onClose', () => {
    const onClose = vi.fn()
    render(<DeleteAccountWizard isOpen onClose={onClose} onDeleted={() => {}} />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(onClose).toHaveBeenCalled()
  })

  it('botón Enviar código deshabilitado sin password', () => {
    render(<DeleteAccountWizard isOpen onClose={() => {}} onDeleted={() => {}} />)
    fireEvent.click(screen.getByTestId('btn-step1-continue'))
    const btn = screen.getByTestId('btn-step2-send-code') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
