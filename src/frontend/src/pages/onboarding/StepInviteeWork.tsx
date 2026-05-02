// v1.6.1 — Paso "cómo trabajas" del onboarding del invitado.
// Captura weeklyWorkHours + workMode para que el motor de cálculo de
// puntos tenga la misma base de info que para el creador.

import { useState } from 'react'
import { Button } from '../../components/v2/primitives/Button'

interface Props {
  onContinue: (data: { weeklyWorkHours: number; workMode: 'presencial' | 'remoto' | 'hibrido' }) => void
  onSkip: () => void
}

export function StepInviteeWork({ onContinue, onSkip }: Props) {
  const [hours, setHours] = useState(40)
  const [mode, setMode] = useState<'presencial' | 'remoto' | 'hibrido'>('presencial')

  return (
    <div className="flex-1 flex flex-col gap-6 py-4">
      <div>
        <h2 className="text-xl font-extrabold text-text-primary">¿Cómo trabajas?</h2>
        <p className="text-sm text-text-secondary mt-1">
          Esto afecta a cómo se calculan los puntos en tareas y eventos.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-text-secondary">
          Horas semanales: <span className="text-text-primary">{hours}h</span>
        </label>
        <input
          type="range" min={0} max={80} value={hours}
          onChange={e => setHours(Number(e.target.value))}
          data-testid="slider-hours"
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-text-secondary">Modo</label>
        <div className="grid grid-cols-3 gap-2">
          {(['presencial', 'remoto', 'hibrido'] as const).map(m => (
            <button
              key={m} type="button"
              data-testid={`mode-${m}`}
              onClick={() => setMode(m)}
              className={`py-2 rounded-lg text-sm capitalize ${m === mode ? 'bg-amber-500 text-black font-medium' : 'bg-surface-card border border-brd-subtle text-text-primary'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto flex gap-2">
        <Button variant="ghost" size="lg" fullWidth onClick={onSkip} data-testid="btn-invitee-work-skip">
          Saltar
        </Button>
        <Button
          variant="primary" size="lg" fullWidth
          data-testid="btn-invitee-work-continue"
          onClick={() => onContinue({ weeklyWorkHours: hours, workMode: mode })}
        >
          Continuar →
        </Button>
      </div>
    </div>
  )
}
