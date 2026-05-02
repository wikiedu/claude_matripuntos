import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LeaveCoupleWizard } from './LeaveCoupleWizard'

describe('LeaveCoupleWizard', () => {
  it('no renderiza si !isOpen', () => {
    render(<LeaveCoupleWizard isOpen={false} onClose={() => {}} onLeft={() => {}} />)
    expect(screen.queryByTestId('leave-couple-wizard')).toBeNull()
  })

  it('renderiza paso 1 educativo con nombre del partner', () => {
    render(<LeaveCoupleWizard isOpen partnerName="Ana" onClose={() => {}} onLeft={() => {}} />)
    expect(screen.getByText(/Mi etapa con/)).toBeInTheDocument()
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
  })

  it('avanza de paso 1 a paso 2', () => {
    render(<LeaveCoupleWizard isOpen onClose={() => {}} onLeft={() => {}} />)
    fireEvent.click(screen.getByTestId('btn-step1-continue'))
    expect(screen.getByTestId('input-password')).toBeInTheDocument()
  })

  it('Cancelar en paso 1 dispara onClose', () => {
    const onClose = vi.fn()
    render(<LeaveCoupleWizard isOpen onClose={onClose} onLeft={() => {}} />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(onClose).toHaveBeenCalled()
  })

  it('Confirmar deshabilitado sin password', () => {
    render(<LeaveCoupleWizard isOpen onClose={() => {}} onLeft={() => {}} />)
    fireEvent.click(screen.getByTestId('btn-step1-continue'))
    const btn = screen.getByTestId('btn-step2-confirm') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
