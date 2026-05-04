// v2.3.0 — Top tabs Tareas/Actividades con semántica económica visible
// (Claude Design canvas 15). +MP verde para Tareas (suman), −MP morado para
// Actividades (consumen). El usuario aprende el modelo económico en una mirada.

import { useNavigate } from 'react-router-dom'

interface Props {
  active: 'tasks' | 'activities'
}

export function MPTabs({ active }: Props) {
  const nav = useNavigate()
  return (
    <div className="grid grid-cols-2 gap-2 px-4 pt-2 pb-3">
      <button
        type="button"
        onClick={() => active !== 'tasks' && nav('/home/tasks')}
        className={`relative overflow-hidden flex flex-col items-start gap-1 px-3.5 pt-3 pb-2.5 rounded-2xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success transition ${
          active === 'tasks'
            ? 'bg-success/10 border-success/55'
            : 'bg-surface-card border-success/30 opacity-55'
        }`}
        style={active === 'tasks' ? { boxShadow: 'inset 0 0 0 2px rgba(34,197,94,0.10)' } : undefined}
        aria-pressed={active === 'tasks'}
      >
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success/15 text-success text-[11px] font-extrabold tracking-wide tabular-nums">
          ＋ MP
        </span>
        <span className="text-[15px] font-extrabold text-text-primary leading-tight tracking-tight">Tareas</span>
        <span className="text-[10px] font-semibold text-text-tertiary">Suman matripuntos</span>
        {active === 'tasks' && (
          <span aria-hidden className="absolute left-3.5 right-3.5 bottom-0 h-0.5 rounded-sm bg-success" />
        )}
      </button>

      <button
        type="button"
        onClick={() => active !== 'activities' && nav('/home/activities')}
        className={`relative overflow-hidden flex flex-col items-start gap-1 px-3.5 pt-3 pb-2.5 rounded-2xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple transition ${
          active === 'activities'
            ? 'bg-brand-purple/10 border-brand-purple/55'
            : 'bg-surface-card border-brand-purple/30 opacity-55'
        }`}
        style={active === 'activities' ? { boxShadow: 'inset 0 0 0 2px rgba(168,85,247,0.10)' } : undefined}
        aria-pressed={active === 'activities'}
      >
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-purple/15 text-brand-purple text-[11px] font-extrabold tracking-wide tabular-nums">
          − MP
        </span>
        <span className="text-[15px] font-extrabold text-text-primary leading-tight tracking-tight">Actividades</span>
        <span className="text-[10px] font-semibold text-text-tertiary">Consumen matripuntos</span>
        {active === 'activities' && (
          <span aria-hidden className="absolute left-3.5 right-3.5 bottom-0 h-0.5 rounded-sm bg-brand-purple" />
        )}
      </button>
    </div>
  )
}

export default MPTabs
