// Horizontal scrollable chip row for category filtering on the Tasks page.
// Active chip uses brand-purple tokens; inactive chips use surface-card tokens.

export const CATEGORY_EMOJI: Record<string, string> = {
  cocina: '🍳', limpieza: '🧹', compra: '🛒', logistica: '📋',
  cuidado: '👶', baños: '🚿', mantenimiento: '🔧', jardineria: '🌿', mascotas: '🐾',
}

export const CATEGORY_LABEL: Record<string, string> = {
  cocina: 'Cocina', limpieza: 'Limpieza', compra: 'Compras', logistica: 'Logística',
  cuidado: 'Cuidado hijos', baños: 'Baños', mantenimiento: 'Mantenimiento',
  jardineria: 'Jardín', mascotas: 'Mascotas',
}

interface Props {
  value: string | 'all'
  onChange: (category: string) => void
  className?: string
}

export function CategoryFilterStrip({ value, onChange, className = '' }: Props) {
  const keys = Object.keys(CATEGORY_EMOJI)

  const chipClass = (active: boolean) =>
    active
      ? 'bg-brand-purple/20 border border-brand-purple/40 text-brand-purple font-bold'
      : 'bg-surface-card border border-brd-subtle text-text-secondary'

  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar pb-1 ${className}`}>
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition ${chipClass(value === 'all')}`}
      >
        Todas
      </button>
      {keys.map((key) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition ${chipClass(active)}`}
          >
            <span className="mr-1">{CATEGORY_EMOJI[key]}</span>
            {CATEGORY_LABEL[key]}
          </button>
        )
      })}
    </div>
  )
}
