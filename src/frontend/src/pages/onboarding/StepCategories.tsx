import { Button } from '../../components/v2/primitives/Button'
import type { OnboardingData } from '../Onboarding'

interface Props {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
  onNext: () => void
}

const CATEGORIES: Array<{ key: string; emoji: string; label: string }> = [
  { key: 'cocina',         emoji: '🍳', label: 'Cocina' },
  { key: 'banos',          emoji: '🛁', label: 'Baños' },
  { key: 'limpieza',       emoji: '🧽', label: 'Limpieza' },
  { key: 'compra',         emoji: '🛒', label: 'Compra' },
  { key: 'logistica',      emoji: '📦', label: 'Logística' },
  { key: 'cuidado',        emoji: '🧸', label: 'Cuidado' },
  { key: 'mantenimiento',  emoji: '🔧', label: 'Mantenimiento' },
  { key: 'jardineria',     emoji: '🌱', label: 'Jardinería' },
  { key: 'mascotas',       emoji: '🐾', label: 'Mascotas' },
]

export function StepCategories({ data, onChange, onNext }: Props) {
  const toggle = (key: string) => {
    const active = data.categories.includes(key)
    const next = active ? data.categories.filter((c) => c !== key) : [...data.categories, key]
    onChange({ categories: next })
  }

  return (
    <div className="flex-1 flex flex-col gap-5 py-4">
      <div>
        <h2 className="text-xl font-extrabold text-text-primary">Elige las categorías</h2>
        <p className="text-sm text-text-secondary mt-1">
          Desactiva las que no apliquen en tu hogar. Podrás añadir más luego.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = data.categories.includes(c.key)
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggle(c.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-semibold transition ${
                active
                  ? 'bg-brand-purple/20 border-brand-purple text-text-primary'
                  : 'bg-surface-card border-brd-subtle text-text-secondary hover:border-brd-purple'
              }`}
            >
              <span className="text-base leading-none">{c.emoji}</span>
              <span>{c.label}</span>
              {active && <span className="ml-1 text-brand-purple">✓</span>}
            </button>
          )
        })}
      </div>

      <div className="text-[11px] text-text-tertiary">
        {data.categories.length} / {CATEGORIES.length} activas
      </div>

      <div className="mt-auto">
        <Button variant="primary" size="lg" fullWidth onClick={onNext}>
          Siguiente →
        </Button>
      </div>
    </div>
  )
}
