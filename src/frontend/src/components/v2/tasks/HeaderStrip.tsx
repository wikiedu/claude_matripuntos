// v2.3.0 — HeaderStrip único (Claude Design canvas 15).
// Sustituye los 4 niveles de UI antiguos (header con botones + view toggle +
// inner tabs + chips) por UNA fila: segment 3-opciones + icono lista/semana
// + botón "+" primario.
//
// Uso simétrico para Tareas y Actividades. La prop `mode` cambia el color
// y los labels del segment.

import { Plus, Calendar, List } from 'lucide-react'

export type HeaderStripMode = 'tasks' | 'activities'
export type FilterValue = 'mine' | 'all' | 'recurring'
export type ViewValue = 'list' | 'week'

interface Props {
  mode: HeaderStripMode
  filter: FilterValue
  onFilterChange: (f: FilterValue) => void
  view: ViewValue
  onViewToggle: () => void
  onAdd: () => void
}

export function HeaderStrip({ mode, filter, onFilterChange, view, onViewToggle, onAdd }: Props) {
  const segLabels: Record<FilterValue, string> = mode === 'tasks'
    ? { mine: 'Mías',    all: 'Todas', recurring: 'Recurrentes' }
    : { mine: 'Activas', all: 'Todas', recurring: 'Plantillas' }

  const isAdd = mode === 'tasks'
  const ringColor = isAdd ? 'focus-visible:ring-success' : 'focus-visible:ring-brand-purple'
  const onActiveBg = isAdd ? 'bg-success/15 text-success' : 'bg-brand-purple/20 text-text-primary'
  const primaryBg = isAdd
    ? 'bg-grad-cta'
    : 'bg-gradient-to-br from-brand-purple to-[#7c3aed]'
  const primaryShadow = isAdd
    ? 'shadow-[0_6px_14px_rgba(245,158,11,0.30)]'
    : 'shadow-[0_6px_14px_rgba(168,85,247,0.35)]'

  return (
    <div className="flex items-center gap-1.5 px-4 pb-3">
      <div className="flex-1 min-w-0 flex gap-0 p-0.5 rounded-[10px] bg-surface-card/80 border border-brd-subtle">
        {(['mine', 'all', 'recurring'] as FilterValue[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={`flex-1 min-w-0 px-1.5 py-1.5 rounded-md text-[10.5px] font-bold whitespace-nowrap overflow-hidden text-ellipsis transition focus-visible:outline-none focus-visible:ring-2 ${ringColor} ${
              filter === f ? onActiveBg : 'text-text-tertiary'
            }`}
            aria-pressed={filter === f}
          >
            {segLabels[f]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onViewToggle}
        aria-label={view === 'list' ? 'Cambiar a vista semana' : 'Cambiar a vista lista'}
        className={`w-9 h-9 rounded-[10px] bg-surface-card border border-brd-subtle text-text-secondary hover:text-text-primary inline-flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 ${ringColor}`}
      >
        {view === 'list' ? <Calendar className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={onAdd}
        aria-label={mode === 'tasks' ? 'Añadir tarea' : 'Nueva actividad'}
        className={`w-9 h-9 rounded-[10px] text-white inline-flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 ${ringColor} ${primaryBg} ${primaryShadow}`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

export default HeaderStrip
