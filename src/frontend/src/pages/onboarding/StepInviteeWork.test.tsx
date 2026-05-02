import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepInviteeWork } from './StepInviteeWork'

describe('StepInviteeWork', () => {
  it('Continuar dispara onContinue con valores por defecto', () => {
    const onContinue = vi.fn()
    render(<StepInviteeWork onContinue={onContinue} onSkip={() => {}} />)
    fireEvent.click(screen.getByTestId('btn-invitee-work-continue'))
    expect(onContinue).toHaveBeenCalledWith({ weeklyWorkHours: 40, workMode: 'presencial' })
  })

  it('cambiar modo a remoto y continuar', () => {
    const onContinue = vi.fn()
    render(<StepInviteeWork onContinue={onContinue} onSkip={() => {}} />)
    fireEvent.click(screen.getByTestId('mode-remoto'))
    fireEvent.click(screen.getByTestId('btn-invitee-work-continue'))
    expect(onContinue).toHaveBeenCalledWith({ weeklyWorkHours: 40, workMode: 'remoto' })
  })

  it('Saltar dispara onSkip', () => {
    const onSkip = vi.fn()
    render(<StepInviteeWork onContinue={() => {}} onSkip={onSkip} />)
    fireEvent.click(screen.getByTestId('btn-invitee-work-skip'))
    expect(onSkip).toHaveBeenCalled()
  })
})
