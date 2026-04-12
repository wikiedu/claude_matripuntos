import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Home, Calendar, List } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { BottomNav } from './BottomNav'

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
    <div style={{ minHeight: '100vh', background: 'var(--matri-bg)', paddingBottom: 72 }}>
      {/* Header */}
      <header style={{ background: 'var(--matri-card-bg)', borderBottom: '1px solid var(--matri-card-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--matri-text-2)' }}
          >
            <Home className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: 'var(--matri-text)' }}>Calendario</h1>
            <p className="text-sm" style={{ color: 'var(--matri-text-2)' }}>{acceptedCount} aceptados · {pendingCount} pendientes</p>
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <button
              onClick={() => setView('month')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              style={view === 'month'
                ? { background: 'var(--matri-card-bg)', color: 'var(--matri-amber)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }
                : { background: 'transparent', color: 'var(--matri-text-2)' }
              }
            >
              <Calendar className="w-4 h-4" />
              Mes
            </button>
            <button
              onClick={() => setView('upcoming')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              style={view === 'upcoming'
                ? { background: 'var(--matri-card-bg)', color: 'var(--matri-amber)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }
                : { background: 'transparent', color: 'var(--matri-text-2)' }
              }
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
            <div style={{ background: 'var(--matri-card-bg)', border: '1px solid var(--matri-card-border)', borderRadius: 16, overflow: 'hidden' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--matri-card-border)' }}>
                <button onClick={goToPrev} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--matri-text-2)' }}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--matri-text)' }}>{monthNames[month - 1]} {year}</h2>
                  {!isCurrentMonth && (
                    <button onClick={goToToday} style={{ fontSize: 12, color: 'var(--matri-amber)' }}>← Volver a hoy</button>
                  )}
                </div>
                <button onClick={goToNext} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--matri-text-2)' }}>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--matri-card-border)' }}>
                {dayNames.map(d => (
                  <div key={d} className="py-2 text-center text-xs font-bold" style={{ color: 'var(--matri-text-3)' }}>{d}</div>
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
                      className="aspect-square flex flex-col items-center justify-start pt-1.5 px-1 relative transition-all"
                      style={isSelected ? { background: 'rgba(245,158,11,0.08)' } : undefined}
                    >
                      <span
                        className="text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full"
                        style={
                          isToday
                            ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontWeight: 700 }
                            : isSelected
                            ? { color: 'var(--matri-amber)', fontWeight: 700 }
                            : { color: 'var(--matri-text)' }
                        }
                      >
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
                  <span className="text-xs" style={{ color: 'var(--matri-text-2)' }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Selected day events */}
            {selectedDay && (
              <div style={{ background: 'var(--matri-card-bg)', border: '1px solid var(--matri-card-border)', borderRadius: 16, padding: '20px' }}>
                <h3 className="font-bold mb-3" style={{ color: 'var(--matri-text)' }}>
                  {selectedDay} de {monthNames[month - 1]}
                </h3>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--matri-text-3)' }}>Sin actividades este día</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map(event => (
                      <button
                        key={event.id}
                        onClick={() => navigate('/dashboard', { state: { openInbox: true, eventId: event.id } })}
                        className="w-full text-left flex items-start gap-3 p-3 rounded-xl border-l-4 transition-opacity hover:opacity-80"
                        style={{
                          background: 'rgba(0,0,0,0.1)',
                          borderLeftColor: event.status === 'accepted' ? '#4ade80' : event.status === 'rejected' ? '#f87171' : '#facc15',
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--matri-text)' }}>{event.title || event.type}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--matri-text-2)' }}>
                            {new Date(event.dateStart).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            {' – '}
                            {new Date(event.dateEnd).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {event.creator && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--matri-text-3)' }}>Por {event.creator.name}</p>
                          )}
                          {(event.status === 'pending' || event.status === 'draft') && (
                            <p className="text-xs font-medium mt-1" style={{ color: 'var(--matri-amber)' }}>→ Toca para gestionar</p>
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
                            <p className="text-xs font-bold mt-1" style={{ color: 'var(--matri-text-2)' }}>
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
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--matri-text-3)' }}>Próximas actividades</h2>
            {upcomingEvents.length === 0 ? (
              <div style={{ background: 'var(--matri-card-bg)', border: '1px solid var(--matri-card-border)', borderRadius: 16, padding: '40px 20px', textAlign: 'center' }}>
                <div className="text-4xl mb-3">📅</div>
                <p className="font-semibold mb-1" style={{ color: 'var(--matri-text)' }}>No hay actividades próximas</p>
                <p className="text-sm mb-5" style={{ color: 'var(--matri-text-2)' }}>Solicita una actividad a tu pareja para verla aquí</p>
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
                const leftBorderColor = event.status === 'accepted' ? '#4ade80' : event.status === 'rejected' ? '#f87171' : '#facc15'
                return (
                  <div
                    key={event.id}
                    style={{
                      background: 'var(--matri-card-bg)',
                      border: '1px solid var(--matri-card-border)',
                      borderRadius: 16,
                      padding: 16,
                      borderLeft: `4px solid ${leftBorderColor}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: 12, padding: 8, textAlign: 'center', minWidth: 52 }}>
                        <div className="text-xs font-bold uppercase" style={{ color: 'var(--matri-text-3)' }}>
                          {start.toLocaleDateString('es-ES', { month: 'short' })}
                        </div>
                        <div className="text-2xl font-black leading-none" style={{ color: 'var(--matri-text)' }}>
                          {start.getDate()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate" style={{ color: 'var(--matri-text)' }}>{event.title || event.type}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--matri-text-2)' }}>
                          {isMultiDay
                            ? `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
                            : `${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                          }
                        </p>
                        {event.creator && (
                          <p className="text-xs" style={{ color: 'var(--matri-text-3)' }}>Propuesto por {event.creator.name}</p>
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
                          <p className="text-sm font-bold mt-1" style={{ color: 'var(--matri-text-2)' }}>
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
      <BottomNav />
    </div>
  )
}
