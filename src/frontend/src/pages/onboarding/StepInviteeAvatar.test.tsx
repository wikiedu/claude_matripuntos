import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepInviteeAvatar } from './StepInviteeAvatar'

describe('StepInviteeAvatar', () => {
  it('llama onContinue con emoji y color al pulsar Continuar', () => {
    const onContinue = vi.fn()
    render(<StepInviteeAvatar onContinue={onContinue} />)
    fireEvent.click(screen.getByTestId('btn-invitee-avatar-continue'))
    expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({
      emoji: expect.any(String),
      color: expect.any(String),
    }))
  })
})
