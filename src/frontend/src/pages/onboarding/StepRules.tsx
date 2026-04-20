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
  const { dailyMult, weeklyBonus } = data.rules

  const setDaily = (v: number) =>
    onChange({ rules: { ...data.rules, dailyMult: round(clamp(v, 1.0, 2.0), 1) } })
  const setWeekly = (v: number) =>
    onChange({ rules: { ...data.rules, weeklyBonus: round(clamp(v, 0, 0.5), 2) } })

  return (
    <div className="flex-1 flex flex-col gap-5 py-4">
      <div>
        <h2 className="text-xl font-extrabold text-text-primary">Ajusta las reglas</h2>
        <p className="text-sm text-text-secondary mt-1">
          Estos multiplican tus puntos diarios y semanales. Puedes ajustarlos luego.
        </p>
      </div>

      <SliderRow
        label="Multiplicador diario"
        description="Se aplica a las tareas completadas cada día."
        value={`×${dailyMult.toFixed(1)}`}
        decrease={() => setDaily(dailyMult - 0.1)}
        increase={() => setDaily(dailyMult + 0.1)}
        disabledMinus={dailyMult <= 1.0}
        disabledPlus={dailyMult >= 2.0}
      />

      <SliderRow
        label="Bonus semanal"
        description="Extra si cumples el objetivo semanal."
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
