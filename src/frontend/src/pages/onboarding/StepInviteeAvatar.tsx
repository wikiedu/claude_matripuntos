// v1.6.1 — Paso "avatar" del onboarding del invitado. Solo se muestra
// tras StepJoinAccount cuando la cuenta entra por joinCode (no creator).
// Mantiene paridad de datos con el creador en avatar+color.

import { useState } from 'react'
import { Button } from '../../components/v2/primitives/Button'
import { AvatarPicker } from '../../components/v2/primitives/AvatarPicker'

interface Props {
  onContinue: (data: { emoji: string; color: string }) => void
}

export function StepInviteeAvatar({ onContinue }: Props) {
  const [emoji, setEmoji] = useState('🦊')
  const [color, setColor] = useState('#7c3aed')

  return (
    <div className="flex-1 flex flex-col gap-6 py-4">
      <div>
        <h2 className="text-xl font-extrabold text-text-primary">Tu avatar</h2>
        <p className="text-sm text-text-secondary mt-1">
          Elige cómo quieres que te vean en la app.
        </p>
      </div>

      <AvatarPicker
        emoji={emoji}
        color={color}
        onChange={({ emoji: e, color: c }) => { setEmoji(e); setColor(c) }}
        size="lg"
      />

      <div className="mt-auto">
        <Button
          variant="primary" size="lg" fullWidth
          data-testid="btn-invitee-avatar-continue"
          onClick={() => onContinue({ emoji, color })}
        >
          Continuar →
        </Button>
      </div>
    </div>
  )
}
