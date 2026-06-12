// Modal "Registrar tarea" (extraído de pages/Tasks.tsx en T2).
// Registra un TaskLog con modificador normal/extra/parcial.

import { useState, useEffect } from 'react'
import { CheckCircle, Loader, X } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'
import { acquireSheetLock, releaseSheetLock } from '../../../lib/sheetLock'
import { Button } from '../primitives/Button'
import { CATEGORY_EMOJI, CATEGORY_LABEL } from './CategoryFilterStrip'
import type { Task } from './taskTypes'

export function LogTaskModal({ task, onClose, onSuccess }: {
  task: Task; onClose: () => void; onSuccess: (points?: number) => void
}) {
  const [modifier, setModifier] = useState<'none' | 'extra' | 'partial'>('none')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // v2.5.6 audit 06 S1 — escape para cerrar + sheetLock auto + a11y.
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && !isSubmitting && onClose()
    window.addEventListener('keydown', onEsc)
    acquireSheetLock()
    return () => {
      window.removeEventListener('keydown', onEsc)
      releaseSheetLock()
    }
  }, [isSubmitting, onClose])

  const base = parseFloat(task.pointsBase) || 10
  const modMap = { none: 1.0, extra: 1.3, partial: 0.7 }
  const finalPts = Math.round(base * modMap[modifier])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await apiClient.tasks.logCompletion(task.id, {
        date: new Date().toISOString(),
        pointsBase: base,
        modifier: modifier !== 'none' ? modifier : undefined,
      })
      onSuccess(finalPts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-task-modal-title"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
    >
      <div className="bg-surface-card border border-brd-purple rounded-xl shadow-xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 id="log-task-modal-title" className="text-base font-bold text-text-primary">Registrar tarea</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-muted rounded-full text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-surface-muted border border-brd-subtle rounded-md p-3 mb-4 flex items-center gap-3">
          <span className="text-2xl">{CATEGORY_EMOJI[task.category?.toLowerCase()] || '✅'}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary truncate">{task.name}</div>
            <div className="text-xs text-text-secondary">
              {CATEGORY_LABEL[task.category?.toLowerCase()] || task.category}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-brand-amber tabular-nums">{finalPts}</div>
            <div className="text-xs text-text-tertiary">pts</div>
          </div>
        </div>

        <div className="mb-4 p-3 bg-brand-purple/10 border border-brand-purple/30 rounded-md text-xs text-brand-purple">
          ℹ️ Los puntos se acreditarán cuando tu pareja <strong>verifique</strong> la tarea.
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-md text-danger text-sm">
            {error}
          </div>
        )}

        <div className="mb-5 space-y-2">
          <p className="text-xs font-semibold text-text-secondary mb-1">¿Cómo fue?</p>
          {([
            { value: 'none' as const, label: '✔️ Normal', desc: `${base} pts` },
            { value: 'extra' as const, label: '⭐ Esfuerzo extra', desc: `+30% → ${Math.round(base * 1.3)} pts` },
            { value: 'partial' as const, label: '🔸 Parcial', desc: `−30% → ${Math.round(base * 0.7)} pts` },
          ]).map((opt) => {
            const active = modifier === opt.value
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition ${
                  active
                    ? 'border-brand-purple/40 bg-brand-purple/10'
                    : 'border-brd-subtle bg-surface-card'
                }`}
              >
                <input
                  type="radio"
                  name="modifier"
                  checked={active}
                  onChange={() => setModifier(opt.value)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{opt.label}</div>
                  <div className="text-xs text-text-secondary">{opt.desc}</div>
                </div>
                {active && <div className="w-2.5 h-2.5 rounded-full bg-brand-purple flex-shrink-0" />}
              </label>
            )
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} fullWidth disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} fullWidth disabled={isSubmitting}>
            <span className="inline-flex items-center gap-2">
              {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Registrar (+{finalPts} pts)
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
