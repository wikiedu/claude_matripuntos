import { useState } from 'react'
import { apiClient } from '../services/apiClient'
import { Send } from 'lucide-react'

interface CounterProposalFormProps {
  eventId: string
  currentProposedPoints: number
  maxPoints?: number
  onSuccess?: () => void
  onCancel?: () => void
}

export const CounterProposalForm = ({
  eventId,
  currentProposedPoints,
  maxPoints = 500,
  onSuccess,
  onCancel,
}: CounterProposalFormProps) => {
  const [pointsProposed, setPointsProposed] = useState<number>(currentProposedPoints)
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pointsDifference = pointsProposed - currentProposedPoints
  const pointsPercentage = ((pointsProposed / currentProposedPoints) * 100 - 100).toFixed(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (pointsProposed < 0 || pointsProposed > maxPoints) {
      setError(`Los puntos deben estar entre 0 y ${maxPoints}`)
      return
    }

    if (pointsProposed === currentProposedPoints) {
      setError('La nueva propuesta debe ser diferente a la actual')
      return
    }

    try {
      setLoading(true)
      setError(null)

      await apiClient.negotiation.respondToProposal(
        eventId,
        'counter_propose',
        pointsProposed,
        message || undefined
      )

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send counter proposal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-orange-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Hacer Contra-propuesta</h3>

      {error && <div className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Proposal Display */}
        <div className="bg-orange-50 p-4 rounded border border-orange-200">
          <div className="text-sm text-gray-600">Propuesta Actual</div>
          <div className="text-2xl font-bold text-orange-700">{currentProposedPoints} puntos</div>
        </div>

        {/* Points Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nueva Propuesta de Puntos
          </label>
          <input
            type="number"
            min="0"
            max={maxPoints}
            step="1"
            value={pointsProposed}
            onChange={(e) => setPointsProposed(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            disabled={loading}
          />
          <div className="text-xs text-gray-500 mt-1">
            Máximo: {maxPoints} puntos
          </div>
        </div>

        {/* Difference Display */}
        {pointsProposed !== currentProposedPoints && (
          <div className={`p-3 rounded text-sm ${
            pointsDifference > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <div className="font-medium">
              {pointsDifference > 0 ? '+' : ''}{pointsDifference} puntos ({pointsPercentage}%)
            </div>
            {pointsDifference > 0
              ? 'Tu pareja estaría ofreciendo más'
              : 'Tú estarías pidiendo menos'}
          </div>
        )}

        {/* Message Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensaje (Opcional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Explica tu contra-propuesta..."
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            disabled={loading}
          />
          <div className="text-xs text-gray-500 mt-1">
            {message.length} / 500 caracteres
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
          <strong>Nota:</strong> Solo puedes hacer una contra-propuesta en esta ronda. Tu pareja tendrá
          la opción de aceptar, rechazar o (si es la ronda 1) hacer otra contra-propuesta.
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || pointsProposed === currentProposedPoints}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {loading ? 'Enviando...' : 'Enviar Contra-propuesta'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
