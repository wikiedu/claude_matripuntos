import { Button } from '../../components/v2/primitives/Button'
import { Input } from '../../components/v2/primitives/Input'
import type { OnboardingData } from '../Onboarding'

interface Props {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
  onNext: () => void
}

const METHODS: Array<{
  key: OnboardingData['pairMethod']
  icon: string
  title: string
  desc: string
}> = [
  { key: 'email', icon: '✉️', title: 'Invitar por email', desc: 'Le enviamos un enlace mágico a tu pareja.' },
  { key: 'code',  icon: '🔑', title: 'Usar código recibido', desc: 'Pega el código que te compartió tu pareja.' },
  { key: 'solo',  icon: '🌱', title: 'Empezar en solitario', desc: 'Puedes invitar a tu pareja más tarde.' },
]

export function StepPair({ data, onChange, onNext }: Props) {
  const emailValid = data.pairMethod !== 'email' || data.pairEmail.includes('@')

  return (
    <div className="flex-1 flex flex-col gap-5 py-4">
      <div>
        <h2 className="text-xl font-extrabold text-text-primary">Conecta con tu pareja</h2>
        <p className="text-sm text-text-secondary mt-1">Matripuntos funciona mejor en pareja, pero puedes empezar a solas.</p>
      </div>

      <div className="flex flex-col gap-2">
        {METHODS.map((m) => {
          const active = data.pairMethod === m.key
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onChange({ pairMethod: m.key })}
              className={`text-left p-4 rounded-xl border transition flex gap-3 items-start ${
                active
                  ? 'bg-brand-purple/15 border-brand-purple'
                  : 'bg-surface-card border-brd-subtle hover:border-brd-purple'
              }`}
            >
              <span className="text-2xl leading-none">{m.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold text-text-primary">{m.title}</div>
                <div className="text-xs text-text-secondary mt-0.5">{m.desc}</div>
              </div>
              <span
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                  active ? 'border-brand-purple bg-brand-purple' : 'border-brd-subtle'
                }`}
              />
            </button>
          )
        })}
      </div>

      {data.pairMethod === 'email' && (
        <Input
          label="Email de tu pareja"
          type="email"
          value={data.pairEmail}
          onChange={(e) => onChange({ pairEmail: e.target.value })}
          placeholder="pareja@ejemplo.com"
        />
      )}

      {data.pairMethod === 'code' && (
        <Input
          label="Código de invitación"
          value={data.pairCode}
          onChange={(e) => onChange({ pairCode: e.target.value })}
          placeholder="Pega aquí el código"
          hint="La unión por código se completará cuando tu pareja te invite."
        />
      )}

      <div className="mt-auto">
        <Button variant="primary" size="lg" fullWidth onClick={onNext} disabled={!emailValid}>
          Siguiente →
        </Button>
      </div>
    </div>
  )
}
