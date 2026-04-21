import { useEffect, useState } from 'react'
import { BottomSheet } from '../primitives/BottomSheet'
import { Button } from '../primitives/Button'

interface Props {
  open: boolean
  currentPoints: number
  onClose: () => void
  onSubmit: (data: { pointsProposed: number; message?: string }) => void
}

export function CounterOfferSheet({ open, currentPoints, onClose, onSubmit }: Props) {
  const [points, setPoints] = useState<string>(String(currentPoints))
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPoints(String(currentPoints))
      setMessage('')
      setError(null)
    }
  }, [open, currentPoints])

  if (!open) return null

  function handleSubmit() {
    const n = Number(points)
    if (!Number.isFinite(n) || n <= 0) {
      setError('Los puntos deben ser mayor que 0')
      return
    }
    onSubmit({ pointsProposed: n, message: message.trim() || undefined })
  }

  return (
    <BottomSheet open onClose={onClose} title="Contraoferta">
      <div className="flex flex-col gap-3 p-4">
        <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
          Puntos propuestos
          <input
            aria-label="Puntos propuestos"
            type="number"
            min={1}
            step="0.5"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="bg-surface-elevated border border-brd-subtle rounded-lg px-3 py-2 text-sm text-text-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
          Mensaje (opcional)
          <textarea
            aria-label="Mensaje"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="bg-surface-elevated border border-brd-subtle rounded-lg px-3 py-2 text-sm text-text-primary"
          />
        </label>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button variant="primary" fullWidth onClick={handleSubmit}>Enviar contraoferta</Button>
      </div>
    </BottomSheet>
  )
}
