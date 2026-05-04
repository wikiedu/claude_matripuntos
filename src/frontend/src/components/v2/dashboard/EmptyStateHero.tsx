// v2.2.7 — Empty state hero (Claude Design canvas 11).
// Se muestra al couple en su día 1: ningún punto registrado todavía. Sustituye
// al hero de balance vacío que mostraba "+0.0" sin contexto.
//
// Sólo se renderiza si `xp === 0` y no hay transactions todavía. En cuanto se
// completa la primera tarea, el hero normal toma el relevo.

import { useNavigate } from 'react-router-dom'

interface Props {
  partnerName: string
}

export function EmptyStateHero({ partnerName }: Props) {
  const nav = useNavigate()
  return (
    <div className="mx-4 mb-3.5">
      <div
        className="rounded-xl p-5 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(245,158,11,0.10))',
          border: '1px solid rgba(168,85,247,0.30)',
        }}
      >
        <div className="text-5xl mb-2">🌱</div>
        <h2 className="m-0 text-lg font-extrabold text-text-primary">Estáis empezando</h2>
        <p className="m-0 mt-1.5 text-xs text-text-secondary leading-relaxed">
          Aún no hay datos. Haced una semana normal y aquí veréis cómo se reparte.
        </p>
      </div>

      <div className="mt-3 rounded-xl p-3.5 bg-surface-card border border-brd-subtle">
        <p className="m-0 text-[10px] font-extrabold tracking-wide uppercase text-brand-amber mb-1">
          1 · Apunta tu primera tarea
        </p>
        <p className="m-0 text-xs text-text-secondary mb-2.5 leading-relaxed">
          Algo que vayas a hacer hoy. Tarda 10 segundos.
        </p>
        <button
          type="button"
          onClick={() => nav('/home/tasks?new=1')}
          className="w-full px-3 py-2.5 rounded-md bg-grad-cta text-white text-sm font-bold shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
        >
          + Apuntar tarea
        </button>
      </div>

      <div className="mt-2 rounded-md p-2.5"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <p className="m-0 text-[11px] text-text-secondary leading-relaxed">
          <strong className="text-brand-purple">💡 Consejo:</strong> el primer día NO ajustéis reglas. Usad las que vienen y ajustad la semana 2 con {partnerName}.
        </p>
      </div>
    </div>
  )
}

export default EmptyStateHero
