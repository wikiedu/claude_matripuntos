import { useState, useEffect } from 'react'
import { apiClient } from '../services/apiClient'
import { MessageCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { formatLocalDateTime } from '../utils/dateUtils'

interface NegotiationRound {
  id: string
  roundNumber: number
  proposedBy?: string
  respondedBy?: string
  pointsProposed?: number
  responseType?: string
  message?: string
  createdAt?: string
  respondedAt?: string
  proposer?: { id: string; name: string }
  responder?: { id: string; name: string }
}

interface NegotiationHistoryProps {
  eventId: string
  eventTitle?: string
  onClose?: () => void
}

export const NegotiationHistory = ({ eventId, eventTitle, onClose }: NegotiationHistoryProps) => {
  const [history, setHistory] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [eventId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiClient.negotiation.getNegotiationHistory(eventId)
      setHistory(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load negotiation history')
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (responseType?: string) => {
    switch (responseType) {
      case 'accepted':
        return <CheckCircle className="text-green-500" size={20} />
      case 'rejected':
        return <XCircle className="text-red-500" size={20} />
      case 'counter_proposed':
        return <AlertCircle className="text-orange-500" size={20} />
      case 'pending_conversation':
        return <MessageCircle className="text-yellow-500" size={20} />
      default:
        return <MessageCircle className="text-blue-500" size={20} />
    }
  }

  const getActionLabel = (responseType?: string) => {
    switch (responseType) {
      case 'accepted':
        return 'Aceptado'
      case 'rejected':
        return 'Rechazado'
      case 'counter_proposed':
        return 'Contra-propuesta'
      case 'pending_conversation':
        return 'Pendiente conversación'
      default:
        return 'Propuesta'
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando historial...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded text-red-700">
        <p className="font-semibold">Error al cargar el historial</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!history || !history.negotiations || history.negotiations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
        <p>No hay negociación aún para este evento</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Historial de Negociación</h2>
            {eventTitle && <p className="text-sm text-gray-600 mt-1">{eventTitle}</p>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total de Rondas:</span>
            <span className="ml-2 font-bold text-gray-900">{history.totalRounds}</span>
          </div>
          <div>
            <span className="text-gray-600">Estado:</span>
            <span className="ml-2 font-bold text-gray-900 capitalize">{history.eventStatus}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="space-y-6">
          {history.negotiations.map((negotiation: NegotiationRound, index: number) => (
            <div key={negotiation.id || index} className="relative">
              {/* Timeline Line */}
              {index < history.negotiations.length - 1 && (
                <div className="absolute left-5 top-12 w-0.5 h-12 bg-gray-200"></div>
              )}

              {/* Card */}
              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 relative z-10">
                  <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full border-2 border-gray-200">
                    {getActionIcon(negotiation.responseType)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-grow bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Ronda {negotiation.roundNumber}: {getActionLabel(negotiation.responseType)}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {negotiation.respondedAt
                          ? formatLocalDateTime(negotiation.respondedAt)
                          : negotiation.createdAt ? formatLocalDateTime(negotiation.createdAt) : ''}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mt-3">
                    {/* Proposer Info */}
                    {negotiation.proposer && (
                      <div className="text-sm">
                        <span className="text-gray-600">Propuesto por:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {negotiation.proposer.name}
                        </span>
                      </div>
                    )}

                    {/* Responder Info */}
                    {negotiation.responder && (
                      <div className="text-sm">
                        <span className="text-gray-600">Respondido por:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {negotiation.responder.name}
                        </span>
                      </div>
                    )}

                    {/* Points */}
                    {negotiation.pointsProposed !== undefined && (
                      <div className="text-sm bg-white p-2 rounded border border-gray-200">
                        <span className="text-gray-600">Puntos Propuestos:</span>
                        <span className="ml-2 font-bold text-lg text-blue-600">
                          {negotiation.pointsProposed}
                        </span>
                      </div>
                    )}

                    {/* Message */}
                    {negotiation.message && (
                      <div className="text-sm bg-white p-3 rounded border border-gray-200 italic text-gray-700">
                        "{negotiation.message}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
        <button
          onClick={loadHistory}
          className="text-sm px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
        >
          🔄 Actualizar
        </button>
      </div>
    </div>
  )
}
