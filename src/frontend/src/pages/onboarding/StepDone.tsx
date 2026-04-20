import { Button } from '../../components/v2/primitives/Button'
import type { OnboardingData } from '../Onboarding'

interface Props {
  data: OnboardingData
  userName: string
  onFinish: () => void
  busy: boolean
  err: string | null
}

const PAIR_LABEL: Record<OnboardingData['pairMethod'], string> = {
  email: 'Invitación por email',
  code:  'Con código recibido',
  solo:  'Empezar en solitario',
}

export function StepDone({ data, userName, onFinish, busy, err }: Props) {
  const { rules, categories, avatarEmoji, avatarColor, pairMethod, pairEmail } = data

  return (
    <div className="flex-1 flex flex-col gap-6 py-4">
      <div className="text-center flex flex-col items-center gap-3">
        <div className="text-6xl">💫</div>
        <h2 className="text-2xl font-extrabold text-text-primary">
          ¡Todo listo, {userName}!
        </h2>
        <p className="text-sm text-text-secondary max-w-xs">
          Revisa tu configuración inicial. Podrás cambiar todo desde Ajustes.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        <li className="flex items-center gap-3 bg-surface-card border border-brd-subtle rounded-xl p-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarEmoji}
          </div>
          <div className="flex-1">
            <div className="text-xs text-text-tertiary">Tu avatar</div>
            <div className="text-sm font-bold text-text-primary">{userName}</div>
          </div>
        </li>

        <li className="flex items-center gap-3 bg-surface-card border border-brd-subtle rounded-xl p-3">
          <span className="text-xl w-10 text-center">👥</span>
          <div className="flex-1">
            <div className="text-xs text-text-tertiary">Conexión con pareja</div>
            <div className="text-sm font-bold text-text-primary">
              {PAIR_LABEL[pairMethod]}
              {pairMethod === 'email' && pairEmail && (
                <span className="text-text-secondary font-normal"> · {pairEmail}</span>
              )}
            </div>
          </div>
        </li>

        <li className="flex items-center gap-3 bg-surface-card border border-brd-subtle rounded-xl p-3">
          <span className="text-xl w-10 text-center">⚖️</span>
          <div className="flex-1">
            <div className="text-xs text-text-tertiary">Reglas</div>
            <div className="text-sm font-bold text-text-primary">
              Diario ×{rules.dailyMult.toFixed(1)} · Semanal +{Math.round(rules.weeklyBonus * 100)}%
            </div>
          </div>
        </li>

        <li className="flex items-center gap-3 bg-surface-card border border-brd-subtle rounded-xl p-3">
          <span className="text-xl w-10 text-center">🏷️</span>
          <div className="flex-1">
            <div className="text-xs text-text-tertiary">Categorías activas</div>
            <div className="text-sm font-bold text-text-primary">
              {categories.length} seleccionadas
            </div>
          </div>
        </li>
      </ul>

      {err && <div className="text-xs text-danger text-center">{err}</div>}

      <div className="mt-auto">
        <Button variant="primary" size="lg" fullWidth onClick={onFinish} disabled={busy}>
          {busy ? 'Guardando…' : '¡Empezamos! →'}
        </Button>
      </div>
    </div>
  )
}
