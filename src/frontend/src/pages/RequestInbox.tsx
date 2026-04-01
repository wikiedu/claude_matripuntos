import { useState, useEffect } from 'react'
import { ArrowLeft, Check, X, Edit, Calendar, Loader } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'

interface Negotiation {
  id: string
  roundNumber: number
  pointsProposed: string
  message?: string
  responseType?: string
  proposer?: { id: string; name: string }
  responder?: { id: string; name: string }
  respondedAt?: string
}

interface Event {
  id: string
  type: string
  title?: string
  description?: string
  dateStart: string
  dateEnd: string
  pointsBase: string
  pointsCalculated: string
  status: string
  negotiationRound: number
  creator?: { id: string; name: string }
  negotiations: Negotiation[]
}

interface Request {
  id: string
  from: string
  type: string
  date: string
  time: string
  duration: string
  pointsProposed: number
  description: string
  compensation?: string
  status: 'pending' | 'negotiating'
  round: number
  negotiations: {
    round: number
    from: string
    points: number
    message: string
    time: string
  }[]
  originalEvent?: Event
}

export default function RequestInbox({ onBack }: { onBack?: () => void }) {
  const { user, couple } = useAppStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [counterOffer, setCounterOffer] = useState('')
  const [counterPoints, setCounterPoints] = useState(0)
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isResponding, setIsResponding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load events and map to requests
  useEffect(() => {
    const loadRequests = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch all events
        const eventsResponse = await apiClient.events.getAll()
        const events = eventsResponse.events || []

        // Map events to requests (filter for those not created by current user)
        const mappedRequests: Request[] = events
          .filter((event: Event) => event.creator?.id !== user?.id)
          .map((event: Event) => {
            const dateStart = new Date(event.dateStart)
            const dateEnd = new Date(event.dateEnd)
            const durationHours = Math.round((dateEnd.getTime() - dateStart.getTime()) / (1000 * 60 * 60))
            const otherUser = couple?.users?.find(_u => _u.id !== user?.id)

            const transformedNegotiations = (event.negotiations || []).map(neg => ({
              round: neg.roundNumber,
              from: neg.proposer?.name || neg.responder?.name || 'Unknown',
              points: Number(neg.pointsProposed),
              message: neg.message || '',
              time: neg.respondedAt
                ? new Date(neg.respondedAt).toLocaleDateString('es-ES')
                : 'Pendiente',
            }))

            return {
              id: event.id,
              from: event.creator?.name || otherUser?.name || 'Partner',
              type: event.title || event.type,
              date: dateStart.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
              time: `${dateStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${dateEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
              duration: `${durationHours} horas`,
              pointsProposed: Number(event.pointsCalculated),
              description: event.description || `Actividad de tipo ${event.type}`,
              status: (event.negotiations && event.negotiations.length > 1) ? 'negotiating' : 'pending' as const,
              round: event.negotiationRound,
              negotiations: transformedNegotiations,
              originalEvent: event,
            }
          })

        setRequests(mappedRequests)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load requests'
        setError(message)
        console.error('Failed to load requests:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.id && couple?.id) {
      loadRequests()
    }
  }, [user?.id, couple?.id])

  const selected = requests.find(r => r.id === selectedId)

  // Set initial counter points when selecting a request
  useEffect(() => {
    if (selected) {
      setCounterPoints(selected.pointsProposed)
      setCounterOffer('')
    }
  }, [selectedId, selected])

  const handleRespond = async (responseType: 'accepted' | 'rejected' | 'counter_proposed') => {
    if (!selected?.originalEvent) {
      setError('Unable to respond: event not found')
      return
    }

    try {
      setIsResponding(true)

      // Get the first negotiation (usually only one exists for draft events)
      const negotiationId = selected.originalEvent.negotiations[0]?.id
      if (!negotiationId) {
        setError('Unable to respond: negotiation not found')
        return
      }

      // Respond to the negotiation
      const response = await apiClient.negotiations.respond(negotiationId, {
        responseType,
        pointsProposed: responseType !== 'rejected' ? counterPoints : undefined,
        message: counterOffer || undefined,
      })

      // Reload the requests after responding
      const eventsResponse = await apiClient.events.getAll()
      const events = eventsResponse.events || []

      const mappedRequests: Request[] = events
        .filter((event: Event) => event.creator?.id !== user?.id)
        .map((event: Event) => {
          const dateStart = new Date(event.dateStart)
          const dateEnd = new Date(event.dateEnd)
          const durationHours = Math.round((dateEnd.getTime() - dateStart.getTime()) / (1000 * 60 * 60))
          const otherUser = couple?.users?.find(_u => _u.id !== user?.id)

          const transformedNegotiations = (event.negotiations || []).map(neg => ({
            round: neg.roundNumber,
            from: neg.proposer?.name || neg.responder?.name || 'Unknown',
            points: Number(neg.pointsProposed),
            message: neg.message || '',
            time: neg.respondedAt
              ? new Date(neg.respondedAt).toLocaleDateString('es-ES')
              : 'Pendiente',
          }))

          return {
            id: event.id,
            from: event.creator?.name || otherUser?.name || 'Partner',
            type: event.title || event.type,
            date: dateStart.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
            time: `${dateStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${dateEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
            duration: `${durationHours} horas`,
            pointsProposed: Number(event.pointsCalculated),
            description: event.description || `Actividad de tipo ${event.type}`,
            status: (event.negotiations && event.negotiations.length > 1) ? 'negotiating' : 'pending' as const,
            round: event.negotiationRound,
            negotiations: transformedNegotiations,
            originalEvent: event,
          }
        })

      setRequests(mappedRequests)
      setSelectedId(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to respond to request'
      setError(message)
      console.error('Failed to respond:', err)
    } finally {
      setIsResponding(false)
    }
  }

  if (selectedId && selected) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => setSelectedId(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Detalle de Solicitud</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Detalles */}
            <div className="lg:col-span-2">
              <div className="card mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selected.type}</h2>
                    <p className="text-gray-600">De: {selected.from}</p>
                  </div>
                  <span className={`badge-${selected.status === 'pending' ? 'warning' : 'danger'}`}>
                    {selected.status === 'pending' ? 'Pendiente' : 'Negociando'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Fecha</p>
                    <p className="font-medium text-gray-900">{selected.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Hora</p>
                    <p className="font-medium text-gray-900">{selected.time}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-gray-700">{selected.description}</p>
                </div>

                {selected.compensation && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-6 text-sm">
                    <p className="text-blue-700">
                      💡 <strong>Compensación:</strong> {selected.compensation}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-900 mb-3">Coste Actual:</p>
                  <div className="bg-warning bg-opacity-10 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Puntos propuestos</span>
                      <span className="text-2xl font-bold text-warning">{selected.pointsProposed}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">MATRIPUNTOS</p>
                  </div>
                </div>
              </div>

              {/* Historial de negociación */}
              {selected.negotiations.length > 0 && (
                <div className="card mb-6">
                  <h3 className="font-bold text-gray-900 mb-4">Historial de Negociación</h3>
                  <div className="space-y-3">
                    {selected.negotiations.map((neg, i) => (
                      <div key={i} className="border-l-4 border-primary pl-4 py-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">Ronda {neg.round}</p>
                            <p className="text-xs text-gray-600">{neg.from}</p>
                          </div>
                          <span className="font-bold text-primary">{neg.points} pts</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{neg.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{neg.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Responder */}
              <div className="card">
                <h3 className="font-bold text-gray-900 mb-4">Tu Respuesta</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Puntos
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={counterPoints}
                      onChange={(e) => setCounterPoints(Number(e.target.value))}
                      className="input-field"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      {counterPoints === selected.pointsProposed
                        ? 'Aceptas el coste propuesto'
                        : `Propones ${counterPoints} en lugar de ${selected.pointsProposed}`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comentario (Opcional)
                    </label>
                    <textarea
                      value={counterOffer}
                      onChange={(e) => setCounterOffer(e.target.value)}
                      placeholder="Explica por qué aceptas, ajustas o rechazas..."
                      className="input-field h-20"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setSelectedId(null)}
                      disabled={isResponding}
                      className="btn-secondary flex-1 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleRespond('rejected')}
                      disabled={isResponding}
                      className="btn-danger flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isResponding ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Rechazar
                    </button>
                    <button
                      onClick={() =>
                        handleRespond(
                          counterPoints === selected.pointsProposed ? 'accepted' : 'counter_proposed'
                        )
                      }
                      disabled={isResponding}
                      className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isResponding ? (
                        <Loader size={16} className="animate-spin" />
                      ) : counterPoints === selected.pointsProposed ? (
                        <>
                          <Check className="w-4 h-4" />
                          Aceptar
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4" />
                          Contrapropuesta
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Info */}
            <div className="lg:col-span-1">
              <div className="card sticky top-24">
                <h3 className="font-bold text-gray-900 mb-4">Resumen</h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">De</p>
                    <p className="font-medium text-gray-900">{selected.from}</p>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-gray-600">Tipo</p>
                    <p className="font-medium text-gray-900">{selected.type}</p>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-gray-600">Duración</p>
                    <p className="font-medium text-gray-900">{selected.duration}</p>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-gray-600">Ronda de Negociación</p>
                    <p className="font-medium text-gray-900">{selected.round + 1} / 2</p>
                  </div>

                  {selected.round >= 1 && (
                    <div className="border-t pt-3 bg-yellow-50 p-3 rounded-lg">
                      <p className="text-yellow-700 text-xs">
                        ⚠️ Última ronda gratis. Después tendrás que pagar por más negociación (Premium).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Lista de solicitudes
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Bandeja de Solicitudes</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-2 text-gray-600">Cargando solicitudes...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
            <button
              key={request.id}
              onClick={() => setSelectedId(request.id)}
              className="card w-full text-left hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{request.type}</h3>
                    <span className={`badge-${request.status === 'pending' ? 'warning' : 'danger'} text-xs`}>
                      {request.status === 'pending' ? 'Pendiente' : 'Negociando'}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-2">De: {request.from}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {request.date}
                    </span>
                    <span>{request.time}</span>
                  </div>

                  <p className="text-gray-700 text-sm line-clamp-2">{request.description}</p>

                  {request.compensation && (
                    <p className="text-xs text-blue-600 mt-2">
                      💡 {request.compensation}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-3xl font-bold text-warning mb-1">
                    {request.pointsProposed}
                  </div>
                  <div className="text-xs text-gray-600">MATRIPUNTOS</div>
                </div>
              </div>

              {request.round > 0 && (
                <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-gray-600">
                  <span>📊 Ronda {request.round + 1} de 2</span>
                </div>
              )}
            </button>
            ))}

            {requests.length === 0 && !isLoading && (
              <div className="card text-center py-12">
                <p className="text-gray-600">No hay solicitudes pendientes</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
