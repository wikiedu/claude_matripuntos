import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'

interface CalendarEntry {
  id: string
  type: 'event' | 'task' | 'service' | 'birthday' | 'holiday'
  title: string
  date: string
  description?: string
  color?: string
}

const typeColors: Record<string, string> = {
  event: 'bg-blue-500',
  task: 'bg-green-500',
  service: 'bg-purple-500',
  birthday: 'bg-pink-500',
  holiday: 'bg-orange-500',
}

const typeEmojis: Record<string, string> = {
  event: '📅',
  task: '✓',
  service: '🔧',
  birthday: '🎂',
  holiday: '🎉',
}

export const CalendarDay: React.FC = () => {
  const { isAuthenticated } = useAppStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'event' as const,
    title: '',
    description: '',
  })

  useEffect(() => {
    fetchDayCalendar()
  }, [selectedDate, isAuthenticated])

  const fetchDayCalendar = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const response = await apiClient.calendar.getDay(dateStr)
      setEntries(response.data?.entries || [])
    } catch (error) {
      console.error('Failed to fetch day calendar:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated || !formData.title) return

    try {
      await apiClient.calendar.createEntry({
        ...formData,
        date: selectedDate.toISOString(),
      })
      setFormData({ type: 'event', title: '', description: '' })
      setShowForm(false)
      fetchDayCalendar()
    } catch (error) {
      console.error('Failed to create entry:', error)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!isAuthenticated || !window.confirm('¿Eliminar este evento?')) return

    try {
      await apiClient.calendar.deleteEntry(entryId)
      fetchDayCalendar()
    } catch (error) {
      console.error('Failed to delete entry:', error)
    }
  }

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${isToday ? 'text-blue-600' : ''}`}>
            {selectedDate.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h2>
          {isToday && <p className="text-sm text-blue-500 mt-1">Hoy</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Día anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Hoy
          </button>
          <button
            onClick={goToNextDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Próximo día"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Add event button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 mb-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
      >
        <Plus size={18} />
        Agregar evento
      </button>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleCreateEntry} className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="event">Evento</option>
              <option value="task">Tarea</option>
              <option value="service">Servicio</option>
              <option value="birthday">Cumpleaños</option>
              <option value="holiday">Feriado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Cena especial"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Descripción (opcional)</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles adicionales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Events list */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">
          {entries.length} {entries.length === 1 ? 'evento' : 'eventos'}
        </h3>

        {entries.length > 0 ? (
          entries.map(entry => (
            <div key={entry.id} className={`p-4 rounded-lg text-white ${typeColors[entry.type]}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{typeEmojis[entry.type]}</span>
                    <h4 className="font-bold text-lg">{entry.title}</h4>
                  </div>
                  {entry.description && <p className="text-sm opacity-90 ml-7">{entry.description}</p>}
                  <p className="text-xs opacity-75 mt-2 ml-7">
                    {new Date(entry.date).toLocaleTimeString('es-ES')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="p-1 hover:bg-black hover:bg-opacity-20 rounded transition"
                  title="Eliminar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-gray-500 italic mb-4">No hay eventos en este día</p>
            <p className="text-sm text-gray-400">Haz clic en "Agregar evento" para crear uno</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  )
}
