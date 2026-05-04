// v2.2.9 — Level-up modal con confeti (Claude Design canvas 13).
// Se muestra una vez cuando el couple sube de nivel. Detección via
// localStorage `mp_last_level_seen`. Auto-dismiss tras 5s o tap.
//
// El modal aporta el "wow" del nivel sin notificación push (que sería ruido).

import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'

const LEVEL_NAMES: Record<number, string> = {
  1: 'Encuentro',  2: 'Confianza',   3: 'Compañía',  4: 'Complicidad',
  5: 'Refugio',    6: 'Raíces',      7: 'Tribu',     8: 'Legado',
  9: 'Eterno',     10: 'Mito',
}

const LEVEL_EMOJI: Record<number, string> = {
  1: '🌱', 2: '🌿', 3: '🤝', 4: '💫', 5: '🏡',
  6: '🌳', 7: '🔥', 8: '💎', 9: '♾️', 10: '⭐',
}

const STORAGE_KEY = 'mp_last_level_seen'

interface Props {
  currentLevel: number
}

export function LevelUpModal({ currentLevel }: Props) {
  const [showFor, setShowFor] = useState<number | null>(null)

  useEffect(() => {
    if (currentLevel < 1) return
    let lastSeen = 0
    try {
      lastSeen = Number(localStorage.getItem(STORAGE_KEY) ?? '0')
    } catch { /* localStorage off — ignoramos */ }

    if (currentLevel > lastSeen) {
      // Si lastSeen=0 (primera vez) y currentLevel=1, no celebramos —
      // todos arrancan en L1. Sólo celebramos los upgrades reales.
      if (lastSeen >= 1 && currentLevel > lastSeen) {
        setShowFor(currentLevel)
      }
      try { localStorage.setItem(STORAGE_KEY, String(currentLevel)) } catch {}
    }
  }, [currentLevel])

  // Auto-dismiss
  useEffect(() => {
    if (showFor === null) return
    const t = window.setTimeout(() => setShowFor(null), 5000)
    return () => window.clearTimeout(t)
  }, [showFor])

  // Confeti: 18 piezas con delays/colores randomizados pero deterministas
  const confettiPieces = useMemo(() => {
    const colors = ['#f59e0b', '#a855f7', '#22c55e', '#fbbf24', '#7c3aed']
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: 5 + (i * 91) % 90,
      delay: (i * 73) % 800,
      color: colors[i % colors.length],
      rot: (i * 37) % 360,
    }))
  }, [showFor])

  if (showFor === null) return null
  const name = LEVEL_NAMES[showFor] ?? 'Nivel'
  const emoji = LEVEL_EMOJI[showFor] ?? '⭐'

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={() => setShowFor(null)}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-xs rounded-2xl text-center px-6 py-8 border"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.30), rgba(168,85,247,0.20))',
          borderColor: 'rgba(245,158,11,0.45)',
          animation: 'mp-pop 600ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-2 leading-none" aria-hidden>{emoji}</div>
        <p className="m-0 text-[10px] uppercase tracking-wide font-extrabold text-brand-amber">
          Habéis subido de nivel
        </p>
        <p className="m-0 mt-1 text-2xl font-extrabold text-text-primary">{name}</p>
        <p className="m-0 mt-1 text-[11px] text-text-tertiary">Lv {showFor}</p>
        <button
          type="button"
          onClick={() => setShowFor(null)}
          className="mt-5 px-3 py-1.5 rounded-md bg-brand-amber text-white text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
        >
          Genial
        </button>

        {/* Confeti */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          {confettiPieces.map((p) => (
            <span
              key={p.id}
              className="absolute block"
              style={{
                left: `${p.left}%`,
                top: '-12px',
                width: 6, height: 12,
                background: p.color,
                borderRadius: 1,
                transform: `rotate(${p.rot}deg)`,
                animation: `mp-fall 2.4s cubic-bezier(0.22, 0.61, 0.36, 1) ${p.delay}ms forwards`,
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes mp-pop {
            0%   { opacity: 0; transform: scale(0.85) translateY(8px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes mp-fall {
            0%   { opacity: 0; transform: translateY(-12px) rotate(0deg); }
            10%  { opacity: 1; }
            100% { opacity: 0; transform: translateY(360px) rotate(540deg); }
          }
        `}</style>
      </div>
    </div>,
    document.body,
  )
}

export default LevelUpModal
