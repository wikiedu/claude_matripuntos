import { Button } from '../../components/v2/primitives/Button'
import { AvatarPicker } from '../../components/v2/primitives/AvatarPicker'
import type { OnboardingData } from '../Onboarding'

interface Props {
  userName: string
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
  onNext: () => void
}

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

      <AvatarPicker
        emoji={data.avatarEmoji ?? '🦊'}
        color={data.avatarColor ?? '#7c3aed'}
        onChange={({ emoji, color }) => onChange({ avatarEmoji: emoji, avatarColor: color })}
        size="lg"
      />

      <div className="mt-auto">
        <Button variant="primary" size="lg" fullWidth onClick={onNext}>
          Siguiente →
        </Button>
      </div>
    </div>
  )
}
