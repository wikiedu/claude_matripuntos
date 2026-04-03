import { useState } from 'react'
import { apiClient } from '../services/apiClient'
import { Check, X, MessageSquare, Clock } from 'lucide-react'

interface NegotiationStatus {
  eventId: string
  status: string
  currentRound: number
  maxRounds: number
  proposedPoints?: number
  agreedPoints?: number
  canCounterPropose: boolean
  isFinalized: boolean
  negotiationHistory: any[]
}

interface EventNegotiationCardProps {
  eventId: string
  eventTitle: string
  createdBy: string
  currentUserId: string
  onStatusChange?: () => void
}

export const EventNegotiationCard = ({
  eventId,
  eventTitle,
  createdBy,
  currentUserId,
  onStatusChange,
}: EventNegotiationCardProps) => {
  const [status, setStatus] = useState<NegotiationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResponses, setShowResponses] = useState(false)
  const isCreator = createdBy === currentUserId
  const isResponder = !isCreator

  const loadStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiClient.negotiation.getNegotiationStatus(eventId)
      setStatus(result.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load negotiation status')
    } finally {
      setLoading(false)
    }
  }

  const handlePropose = async () => {
    if (!confirm('¿Enviar propuesta a tu pareja?')) return

    try {
      setLoading(true)
      await apiClient.negotiation.proposeEvent(eventId)
      await loadStatus()
      onStatusChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to propose event')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!confirm('¿Aceptar esta propuesta?')) return

    try {
      setLoading(true)
      await apiClient.negotiation.respondToProposal(eventId, 'accept')
      await loadStatus()
      onStatusChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept proposal')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!confirm('¿Rechazar esta propuesta?')) return

    try {
      setLoading(true)
      await apiClient.negotiation.respondToProposal(eventId, 'reject')
      await loadStatus()
      onStatusChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject proposal')
    } finally {
      setLoading(false)
    }
  }

  const handlePendingConversation = async () => {
    try {
      setLoading(true)
      await apiClient.negotiation.respondToProposal(
        eventId,
        'pending_conversation',
        undefined,
        'Preferimos hablarlo en persona'
      )
      await loadStatus()
      onStatusChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as pending conversation')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'proposed':
        return 'bg-blue-100 text-blue-800'
      case 'counter_proposal':
        return 'bg-orange-100 text-orange-800'
      case 'pending_conversation':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Borrador'
      case 'proposed':
        return 'Propuesta Enviada'
      case 'counter_proposal':
        return 'Contra-propuesta'
      case 'pending_conversation':
        return 'Pendiente Conversación'
      case 'accepted':
        return 'Aceptado'
      case 'rejected':
        return 'Rechazado'
      default:
        return status
    }
  }

  if (!status && !loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <button
          onClick={loadStatus}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Cargando...' : 'Ver Estado de Negociación'}
        </button>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-4">Cargando...</div>
  }

  if (!status) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{eventTitle}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.status)}`}>
          {getStatusLabel(status.status)}
        </span>
      </div>

      {error && <div className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded">{error}</div>}

      {/* Status Info */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Ronda Actual:</span>
          <span className="font-medium">
            {status.currentRound} / {status.maxRounds}
          </span>
        </div>

        {status.proposedPoints !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Puntos Propuestos:</span>
            <span className="font-medium">{status.proposedPoints} pts</span>
          </div>
        )}

        {status.agreedPoints !== undefined && (
          <div className="flex items-center justify-between text-sm bg-green-50 p-2 rounded">
            <span className="text-green-700">Puntos Acordados:</span>
            <span className="font-semibold text-green-700">{status.agreedPoints} pts</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Creator Actions - Draft */}
        {isCreator && status.status === 'draft' && (
          <button
            onClick={handlePropose}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <MessageSquare size={18} />
            Enviar Propuesta
          </button>
        )}

        {/* Responder Actions - Proposed */}
        {isResponder && status.status === 'proposed' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAccept}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Aceptar
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <X size={18} />
              Rechazar
            </button>
          </div>
        )}

        {/* Responder Actions - Counter Proposal */}
        {isResponder && status.status === 'counter_proposal' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAccept}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Aceptar
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>
        )}

        {/* Pending Conversation Button */}
        {!status.isFinalized && (
          <button
            onClick={handlePendingConversation}
            disabled={loading}
            className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Clock size={18} />
            Hablamos en Persona
          </button>
        )}

        {/* History Button */}
        <button
          onClick={() => setShowResponses(!showResponses)}
          className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          {showResponses ? 'Ocultar' : 'Ver'} Historial ({status.negotiationHistory?.length || 0})
        </button>
      </div>

      {/* History */}
      {showResponses && status.negotiationHistory && status.negotiationHistory.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-semibold mb-3">Historial de Negociación</h4>
          <div className="space-y-2 text-sm">
            {status.negotiationHistory.map((neg, idx) => (
              <div key={idx} className="bg-gray-50 p-2 rounded">
                <div className="flex justify-between items-start">
                  <span className="font-medium">Ronda {neg.roundNumber}</span>
                  {neg.responseType && (
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">{neg.responseType}</span>
                  )}
                </div>
                {neg.pointsProposed && <div className="text-gray-600">Puntos: {neg.pointsProposed}</div>}
                {neg.message && <div className="text-gray-600 italic">"{neg.message}"</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finalized Status */}
      {status.isFinalized && (
        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
          {status.status === 'accepted' && '✓ Evento aceptado y acordado'}
          {status.status === 'rejected' && '✗ Evento rechazado'}
          {status.status === 'pending_conversation' && '💬 Pendiente de conversación en persona'}
        </div>
      )}
    </div>
  )
}
