// v2.2.0 — Microinteracción "+X MP" flotante al completar una tarea.
// Handoff Claude Design canvas 13. Animación 1400ms (más corta que el preview
// 2.4s del mockup, pensado para uso real, no demo bucle).
//
// Uso:
//   const { trigger, node } = usePointsBurst()
//   ...
//   <button onClick={(e) => { trigger('+15 MP', e.currentTarget); doComplete() }}>
//   { node }   // pinta el flotador globalmente

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface BurstInstance {
  id: number
  text: string
  x: number
  y: number
}

let _seq = 1

export function usePointsBurst() {
  const [bursts, setBursts] = useState<BurstInstance[]>([])
  const timeoutsRef = useRef<Map<number, number>>(new Map())

  // Audit 2026-06-07 §3.3 — los timeouts de 1400ms vivían en un ref sin
  // cleanup de desmontaje: si el componente se desmontaba antes de disparar,
  // ejecutaban setState sobre un componente desmontado. Limpiamos todos al
  // desmontar.
  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach((handle) => window.clearTimeout(handle))
      timeouts.clear()
    }
  }, [])

  const trigger = useCallback((text: string, anchorEl?: Element | null) => {
    const id = _seq++
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    if (anchorEl) {
      const r = anchorEl.getBoundingClientRect()
      x = r.left + r.width / 2
      y = r.top + r.height / 2
    }
    setBursts((prev) => [...prev, { id, text, x, y }])
    const handle = window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id))
      timeoutsRef.current.delete(id)
    }, 1400)
    timeoutsRef.current.set(id, handle)
  }, [])

  const node = createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden>
      {bursts.map((b) => (
        <span
          key={b.id}
          className="absolute select-none font-extrabold tabular-nums text-2xl"
          style={{
            left: b.x,
            top: b.y,
            color: '#f59e0b',
            textShadow: '0 4px 12px rgba(245,158,11,0.55)',
            transform: 'translate(-50%, -50%)',
            animation: 'mp-rise 1400ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
          }}
        >
          {b.text}
        </span>
      ))}
      <style>{`
        @keyframes mp-rise {
          0%   { opacity: 0; transform: translate(-50%, -10%) scale(0.9); }
          18%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          75%  { opacity: 1; transform: translate(-50%, -120%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -160%) scale(0.9); }
        }
      `}</style>
    </div>,
    document.body,
  )

  return { trigger, node }
}
