import { Button } from '../../components/v2/primitives/Button'
import type { OnboardingData } from '../Onboarding'

interface Props {
  data: OnboardingData
  userName: string
  pairMethod: OnboardingData['pairMethod']
  inviteeEmail: string
  onFinish: () => void
  busy: boolean
  err: string | null
}

function pairStatusLine(
  pairMethod: OnboardingData['pairMethod'],
  inviteeEmail: string,
): string {
  if (pairMethod === 'email' && inviteeEmail.trim().length > 0) {
    return `Invitación enviada a ${inviteeEmail}`
  }
  if (pairMethod === 'code') {
    return 'Vinculado con tu pareja'
  }
  return 'Solo/a por ahora — puedes invitar a tu pareja más tarde'
}

export function StepDone({
  data,
  userName,
  pairMethod,
  inviteeEmail,
  onFinish,
  busy,
  err,
}: Props) {
  const { rules, categories, avatarEmoji, avatarColor } = data
  const partnerStatus = pairStatusLine(pairMethod, inviteeEmail)

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
              {partnerStatus}
            </div>
          </div>
        </li>

        <li className="flex items-center gap-3 bg-surface-card border border-brd-subtle rounded-xl p-3">
          <span className="text-xl w-10 text-center">⚖️</span>
          <div className="flex-1">
            <div className="text-xs text-text-tertiary">Reglas</div>
            <div className="text-sm font-bold text-text-primary">
              Nocturno ×{rules.nightMult.toFixed(1)} · Fin de semana +{Math.round(rules.weeklyBonus * 100)}%
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
          {busy ? 'Guardando…' : 'Entrar a Matripuntos 💕'}
        </Button>
      </div>
    </div>
  )
}
