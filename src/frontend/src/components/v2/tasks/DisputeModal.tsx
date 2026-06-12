// Modal "Disputar tarea" (extraído de pages/Tasks.tsx en T2).

import { useState, useEffect } from 'react'
import { AlertTriangle, Loader } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'
import { acquireSheetLock, releaseSheetLock } from '../../../lib/sheetLock'
import { Button } from '../primitives/Button'
import type { TaskLog } from './taskTypes'

export function DisputeModal({ log, onClose, onSuccess }: {
  log: TaskLog; onClose: () => void; onSuccess: () => void
}) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // v2.5.6 audit 06 S1 — escape + sheetLock auto + a11y.
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && !isSubmitting && onClose()
    window.addEventListener('keydown', onEsc)
    acquireSheetLock()
    return () => {
      window.removeEventListener('keydown', onEsc)
      releaseSheetLock()
    }
  }, [isSubmitting, onClose])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await apiClient.tasks.disputeLog(log.taskId, log.id, { disputeReason: reason.trim() || 'Sin motivo' })
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al disputar')
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-modal-title"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
    >
      <div className="bg-surface-card border border-brd-purple rounded-xl shadow-xl max-w-sm w-full p-5">
        <h3 id="dispute-modal-title" className="text-base font-bold text-text-primary mb-1">⚠️ Disputar tarea</h3>
        <p className="text-sm text-text-secondary mb-4">
          Disputando <strong className="text-text-primary">{log.taskName}</strong> de{' '}
          <strong className="text-text-primary">{log.completedBy?.name}</strong> ({log.pointsFinal} pts)
        </p>
        {error && (
          <div className="mb-3 p-3 bg-danger/10 border border-danger/30 rounded-md text-danger text-sm">
            {error}
          </div>
        )}
        <label className="text-xs font-semibold text-text-secondary mb-1 block">Motivo (opcional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="¿Por qué cuestionas esta tarea?"
          rows={3}
          className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 mb-4"
        />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} fullWidth disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleSubmit} fullWidth disabled={isSubmitting}>
            <span className="inline-flex items-center gap-1">
              {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Disputar
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
