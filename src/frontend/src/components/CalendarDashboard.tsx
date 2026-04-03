import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Home, Calendar, List } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'

interface AppEvent {
  id: string
  type: string
  title: string
  dateStart: string
  dateEnd: string
  status: string
  pointsAgreed?: string
  pointsCalculated?: string
  creator?: { id: string; name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  accepted: 'bg-green-500',
  pending: 'bg-yellow-400',
  draft: 'bg-blue-400',
  rejected: 'bg-red-400',
  negotiating: 'bg-purple-400',
}

const STATUS_LABELS: Record<string, string> = {
  accepted: '✅ Aceptado',
  pending: '⏳ Pendiente',
  draft: '📝 Enviado',
  rejected: '❌ Rechazado',
  negotiating: '🤝 Negociando',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  // Returns 0=Mon, 1=Tue, ..., 6=Sun (European style)
  const day = new Date(year, month - 1, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export const CalendarDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAppStore()
  const [view, setView] = useState<'month' | 'upcoming'>('month')
  const [events, setEvents] = useState<AppEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  useEffect(() => {
    if (isAuthenticated) fetchEvents()
  }, [isAuthenticated])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const response = await apiClient.events.getAll()
      setEvents(response.events || [])
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => {
      const start = e.dateStart?.split('T')[0]
      const end = e.dateEnd?.split('T')[0]
      return start <= dateStr && dateStr <= end
    })
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
  const todayDay = today.getDate()

  const goToPrev = () => setCurrentDate(new Date(year, month - 2, 1))
  const goToNext = () => setCurrentDate(new Date(year, month, 1))
  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(new Date().getDate())
  }

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  // Upcoming: accepted events in the future
  const now = new Date()
  const upcomingEvents = events
    .filter(e => new Date(e.dateStart) >= now)
    .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime())
    .slice(0, 20)

  const acceptedCount = events.filter(e => e.status === 'accepted').length
  const pendingCount = events.filter(e => e.status === 'pending' || e.status === 'draft').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Home className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Calendario</h1>
            <p className="text-sm text-gray-500">{acceptedCount} aceptados · {pendingCount} pendientes</p>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setView('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'month' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}
            >
              <Calendar className="w-4 h-4" />
              Mes
            </button>
            <button
              onClick={() => setView('upcoming')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'upcoming' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}
            >
              <List className="w-4 h-4" />
              Lista
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : view === 'month' ? (
          <div className="space-y-4">
            {/* Month navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <button onClick={goToPrev} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="text-center">
                  <h2 className="text-lg font-bold text-gray-900">{monthNames[month - 1]} {year}</h2>
                  {!isCurrentMonth && (
                    <button onClick={goToToday} className="text-xs text-blue-600 hover:text-blue-800">← Volver a hoy</button>
                  )}
                </div>
                <button onClick={goToNext} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {dayNames.map(d => (
                  <div key={d} className="py-2 text-center text-xs font-bold text-gray-400">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7">
                {/* Empty cells before first day */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dayEvents = getEventsForDay(day)
                  const isToday = isCurrentMonth && day === todayDay
                  const isSelected = day === selectedDay

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`aspect-square flex flex-col items-center justify-start pt-1.5 px-1 relative transition-all hover:bg-gray-50 ${
                        isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''
                      }`}
                    >
                      <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-primary text-white font-bold'
                          : isSelected
                          ? 'text-primary font-bold'
                          : 'text-gray-700'
                      }`}>
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                          {dayEvents.slice(0, 3).map(e => (
                            <div
                              key={e.id}
                              className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[e.status] || 'bg-gray-400'}`}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-xs text-gray-400 leading-none">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 flex-wrap px-1">
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}
            </div>

            {/* Selected day events */}
            {selectedDay && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-3">
                  {selectedDay} de {monthNames[month - 1]}
                </h3>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sin actividades este día</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map(event => (
                      <button
                        key={event.id}
                        onClick={() => navigate('/dashboard', { state: { openInbox: true, eventId: event.id } })}
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border-l-4 transition-opacity hover:opacity-80 ${
                          event.status === 'accepted' ? 'bg-green-50 border-green-400' :
                          event.status === 'rejected' ? 'bg-red-50 border-red-400' :
                          'bg-yellow-50 border-yellow-400'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{event.title || event.type}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(event.dateStart).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            {' – '}
                            {new Date(event.dateEnd).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {event.creator && (
                            <p className="text-xs text-gray-400 mt-0.5">Por {event.creator.name}</p>
                          )}
                          {(event.status === 'pending' || event.status === 'draft') && (
                            <p className="text-xs font-medium text-yellow-700 mt-1">→ Toca para gestionar</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            event.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            event.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {STATUS_LABELS[event.status] || event.status}
                          </span>
                          {(event.pointsAgreed || event.pointsCalculated) && (
                            <p className="text-xs font-bold text-gray-600 mt-1">
                              {event.pointsAgreed || event.pointsCalculated} pts
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Upcoming / List view */
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Próximas actividades</h2>
            {upcomingEvents.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                <div className="text-4xl mb-3">📅</div>
                <p className="font-semibold text-gray-700 mb-1">No hay actividades próximas</p>
                <p className="text-sm text-gray-400 mb-5">Solicita una actividad a tu pareja para verla aquí</p>
                <button
                  onClick={() => navigate('/request-activity')}
                  className="btn-primary mx-auto"
                >
                  Solicitar actividad
                </button>
              </div>
            ) : (
              upcomingEvents.map(event => {
                const start = new Date(event.dateStart)
                const end = new Date(event.dateEnd)
                const isMultiDay = start.toDateString() !== end.toDateString()
                return (
                  <div
                    key={event.id}
                    className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm border-l-4 ${
                      event.status === 'accepted' ? 'border-l-green-400' :
                      event.status === 'rejected' ? 'border-l-red-400' :
                      'border-l-yellow-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-gray-50 rounded-xl p-2 text-center min-w-[52px]">
                        <div className="text-xs font-bold text-gray-400 uppercase">
                          {start.toLocaleDateString('es-ES', { month: 'short' })}
                        </div>
                        <div className="text-2xl font-black text-gray-900 leading-none">
                          {start.getDate()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{event.title || event.type}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {isMultiDay
                            ? `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
                            : `${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                          }
                        </p>
                        {event.creator && (
                          <p className="text-xs text-gray-400">Propuesto por {event.creator.name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          event.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          event.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {STATUS_LABELS[event.status] || event.status}
                        </span>
                        {(event.pointsAgreed || event.pointsCalculated) && (
                          <p className="text-sm font-bold text-gray-700 mt-1">
                            {event.pointsAgreed || event.pointsCalculated} pts
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </main>
    </div>
  )
}
