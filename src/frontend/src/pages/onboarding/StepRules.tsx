import { Button } from '../../components/v2/primitives/Button'
import type { OnboardingData } from '../Onboarding'

interface Props {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
  onNext: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(v: number, decimals: number) {
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}

interface RowProps {
  label: string
  description: string
  value: string
  decrease: () => void
  increase: () => void
  disabledMinus: boolean
  disabledPlus: boolean
}

function SliderRow({ label, description, value, decrease, increase, disabledMinus, disabledPlus }: RowProps) {
  return (
    <div className="bg-surface-card border border-brd-subtle rounded-xl p-4 flex flex-col gap-3">
      <div>
        <div className="text-sm font-bold text-text-primary">{label}</div>
        <div className="text-[11px] text-text-tertiary mt-0.5">{description}</div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={decrease}
          disabled={disabledMinus}
          className="w-11 h-11 rounded-full bg-surface-muted border border-brd-purple text-text-primary text-xl font-bold disabled:opacity-40"
          aria-label={`Bajar ${label}`}
        >
          −
        </button>
        <div className="text-2xl font-extrabold text-brand-purple tabular-nums">{value}</div>
        <button
          type="button"
          onClick={increase}
          disabled={disabledPlus}
          className="w-11 h-11 rounded-full bg-surface-muted border border-brd-purple text-text-primary text-xl font-bold disabled:opacity-40"
          aria-label={`Subir ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

export function StepRules({ data, onChange, onNext }: Props) {
  const { nightMult, weeklyBonus } = data.rules

  const setNight = (v: number) =>
    onChange({ rules: { ...data.rules, nightMult: round(clamp(v, 1.2, 1.6), 1) } })
  const setWeekly = (v: number) =>
    onChange({ rules: { ...data.rules, weeklyBonus: round(clamp(v, 0, 0.5), 2) } })

  return (
    <div className="flex-1 flex flex-col gap-5 py-4">
      <div>
        <h2 className="text-xl font-extrabold text-text-primary">Ajusta las reglas</h2>
        <p className="text-sm text-text-secondary mt-1">
          Estos multiplican los puntos en franja nocturna y en fin de semana. Puedes ajustarlos luego.
        </p>
      </div>

      <SliderRow
        label="Multiplicador nocturno"
        description="Se aplica a las tareas hechas por la noche."
        value={`×${nightMult.toFixed(1)}`}
        decrease={() => setNight(nightMult - 0.1)}
        increase={() => setNight(nightMult + 0.1)}
        disabledMinus={nightMult <= 1.2}
        disabledPlus={nightMult >= 1.6}
      />

      <SliderRow
        label="Bonus fin de semana"
        description="Extra aplicado a sábado y domingo."
        value={`+${Math.round(weeklyBonus * 100)}%`}
        decrease={() => setWeekly(weeklyBonus - 0.05)}
        increase={() => setWeekly(weeklyBonus + 0.05)}
        disabledMinus={weeklyBonus <= 0}
        disabledPlus={weeklyBonus >= 0.5}
      />

      <div className="mt-auto">
        <Button variant="primary" size="lg" fullWidth onClick={onNext}>
          Siguiente →
        </Button>
      </div>
    </div>
  )
}
