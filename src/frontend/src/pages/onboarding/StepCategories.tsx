import { useState } from 'react'
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

const DEFAULT_KEYS = new Set(CATEGORIES.map((c) => c.key))

function customKey(name: string): string {
  return `custom:${name.trim().toLowerCase()}`
}

export function StepCategories({ data, onChange, onNext }: Props) {
  const [input, setInput] = useState('')

  const toggle = (key: string) => {
    const active = data.categories.includes(key)
    const next = active ? data.categories.filter((c) => c !== key) : [...data.categories, key]
    onChange({ categories: next })
  }

  const addCustom = () => {
    const name = input.trim()
    if (!name) return
    const key = customKey(name)
    // Avoid duplicates (case-insensitive via key).
    if (data.categories.includes(key)) {
      setInput('')
      return
    }
    onChange({ categories: [...data.categories, key] })
    setInput('')
  }

  const removeCustom = (key: string) => {
    onChange({ categories: data.categories.filter((c) => c !== key) })
  }

  const customCategories = data.categories.filter(
    (c) => !DEFAULT_KEYS.has(c) && c.startsWith('custom:'),
  )

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

        {customCategories.map((key) => {
          const name = key.replace(/^custom:/, '')
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-semibold bg-brand-amber/15 border-brand-amber text-text-primary"
            >
              <span className="text-base leading-none">✨</span>
              <span className="capitalize">{name}</span>
              <button
                type="button"
                onClick={() => removeCustom(key)}
                className="ml-1 w-4 h-4 rounded-full bg-brand-amber/40 text-[10px] leading-none flex items-center justify-center hover:bg-brand-amber/70"
                aria-label={`Quitar ${name}`}
              >
                ✕
              </button>
            </span>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
          placeholder="Añade una categoría propia"
          maxLength={30}
          className="flex-1 bg-surface-card border border-brd-subtle rounded-full px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-purple"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!input.trim()}
          className="px-4 py-2 rounded-full bg-brand-purple text-white text-sm font-bold disabled:opacity-40"
        >
          + Añadir
        </button>
      </div>

      <div className="text-[11px] text-text-tertiary">
        {data.categories.length} activas
      </div>

      <div className="mt-auto">
        <Button variant="primary" size="lg" fullWidth onClick={onNext}>
          Siguiente →
        </Button>
      </div>
    </div>
  )
}
