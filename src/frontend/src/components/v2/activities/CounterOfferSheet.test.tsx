import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CounterOfferSheet } from './CounterOfferSheet'

const submit = vi.fn()

beforeEach(() => { submit.mockReset() })

describe('CounterOfferSheet', () => {
  it('is hidden when open=false', () => {
    render(<CounterOfferSheet open={false} onClose={() => {}} currentPoints={12} onSubmit={submit} />)
    expect(screen.queryByText(/Contraoferta/)).not.toBeInTheDocument()
  })

  it('shows current points as default in the input when opened', () => {
    render(<CounterOfferSheet open currentPoints={12} onClose={() => {}} onSubmit={submit} />)
    const input = screen.getByLabelText(/Puntos propuestos/i) as HTMLInputElement
    expect(input.value).toBe('12')
  })

  it('submits new points + message', async () => {
    const user = userEvent.setup()
    render(<CounterOfferSheet open currentPoints={12} onClose={() => {}} onSubmit={submit} />)
    const input = screen.getByLabelText(/Puntos propuestos/i)
    await user.clear(input); await user.type(input, '9')
    await user.type(screen.getByLabelText(/Mensaje/i), 'Demasiado')
    await user.click(screen.getByRole('button', { name: /Enviar/i }))
    expect(submit).toHaveBeenCalledWith({ pointsProposed: 9, message: 'Demasiado' })
  })

  it('rejects submit when points empty or ≤ 0', async () => {
    render(<CounterOfferSheet open currentPoints={12} onClose={() => {}} onSubmit={submit} />)
    const input = screen.getByLabelText(/Puntos propuestos/i)
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }))
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByText(/mayor que 0/i)).toBeInTheDocument()
  })
})
