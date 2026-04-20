import { Button } from '../../components/v2/primitives/Button'
import type { OnboardingData } from '../Onboarding'

interface Props {
  userName: string
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
  onNext: () => void
}

const EMOJIS = [
  '🧑', '👩', '👨', '🧒', '👶', '🦊',
  '🐻', '🐯', '🦁', '🐼', '🐨', '🐰',
  '🌸', '🌻', '🌙', '⭐', '🔥', '💎',
]
const COLORS = [
  { value: '#7c3aed', name: 'purple' },
  { value: '#f59e0b', name: 'amber' },
  { value: '#ec4899', name: 'pink' },
  { value: '#10b981', name: 'emerald' },
  { value: '#6366f1', name: 'indigo' },
  { value: '#14b8a6', name: 'teal' },
  { value: '#f472b6', name: 'rose' },
  { value: '#a3e635', name: 'lime' },
]

export function StepProfile({ userName, data, onChange, onNext }: Props) {
  return (
    <div className="flex-1 flex flex-col gap-6 py-4">
      <div>
        <h2 className="text-xl font-extrabold text-text-primary">
          Hola, {userName}
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Elige cómo quieres que te vean en la app.
        </p>
      </div>

      <div className="flex justify-center">
        <div
          className="w-[96px] h-[96px] rounded-full flex items-center justify-center text-5xl shadow-xl"
          style={{ backgroundColor: data.avatarColor, boxShadow: `0 10px 30px -10px ${data.avatarColor}` }}
        >
          {data.avatarEmoji}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-text-secondary">Tu avatar</span>
        <div className="grid grid-cols-6 gap-2">
          {EMOJIS.map((e) => {
            const active = data.avatarEmoji === e
            return (
              <button
                key={e}
                type="button"
                onClick={() => onChange({ avatarEmoji: e })}
                className={`aspect-square rounded-xl text-2xl flex items-center justify-center border transition ${
                  active
                    ? 'bg-brand-purple/20 border-brand-purple'
                    : 'bg-surface-card border-brd-subtle hover:border-brd-purple'
                }`}
                aria-label={`Avatar ${e}`}
              >
                {e}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-text-secondary">Tu color</span>
        <div className="grid grid-cols-8 gap-2">
          {COLORS.map((c) => {
            const active = data.avatarColor === c.value
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onChange({ avatarColor: c.value })}
                className={`aspect-square rounded-full transition ${
                  active ? 'ring-2 ring-offset-2 ring-offset-surface-base ring-text-primary scale-110' : ''
                }`}
                style={{ backgroundColor: c.value }}
                aria-label={`Color ${c.name}`}
              />
            )
          })}
        </div>
      </div>

      <div className="mt-auto">
        <Button variant="primary" size="lg" fullWidth onClick={onNext}>
          Siguiente →
        </Button>
      </div>
    </div>
  )
}
