import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

export const CalendarMonth: React.FC = () => {
  const { isAuthenticated } = useAppStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  useEffect(() => {
    fetchMonthCalendar()
  }, [year, month, isAuthenticated])

  const fetchMonthCalendar = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const response = await apiClient.calendar.getMonth(year, month)
      setEntries(response.data?.entries || [])
    } catch (error) {
      console.error('Failed to fetch calendar:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m - 1, 1).getDay()

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

  const getEntriesForDay = (day: number) => {
    const dateStr = new Date(year, month - 1, day).toISOString().split('T')[0]
    return entries.filter(e => new Date(e.date).toISOString().split('T')[0] === dateStr)
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold capitalize">{monthName}</h2>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Mes anterior"
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
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Próximo mes"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'].map(day => (
          <div key={day} className="text-center font-bold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 bg-gray-50 p-2 rounded-lg">
        {/* Empty cells for days before month starts */}
        {emptyDays.map(i => (
          <div key={`empty-${i}`} className="aspect-square bg-gray-100 rounded"></div>
        ))}

        {/* Days of month */}
        {days.map(day => {
          const dayEntries = getEntriesForDay(day)
          const isToday = new Date().toDateString() === new Date(year, month - 1, day).toDateString()

          return (
            <div
              key={day}
              onClick={() => setSelectedDate(new Date(year, month - 1, day))}
              className={`aspect-square p-2 rounded border cursor-pointer transition ${
                isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`text-sm font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                {day}
              </div>
              <div className="space-y-1">
                {dayEntries.slice(0, 2).map(entry => (
                  <div
                    key={entry.id}
                    className={`text-xs p-1 rounded text-white truncate ${typeColors[entry.type]}`}
                    title={entry.title}
                  >
                    {typeEmojis[entry.type]} {entry.title}
                  </div>
                ))}
                {dayEntries.length > 2 && (
                  <div className="text-xs text-gray-600 px-1">+{dayEntries.length - 2} más</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected day details */}
      {selectedDate && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-bold text-lg mb-4">
            {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <div className="space-y-2">
            {getEntriesForDay(selectedDate.getDate()).length > 0 ? (
              getEntriesForDay(selectedDate.getDate()).map(entry => (
                <div key={entry.id} className={`p-3 rounded-lg text-white ${typeColors[entry.type]}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeEmojis[entry.type]}</span>
                    <div>
                      <div className="font-bold">{entry.title}</div>
                      {entry.description && <div className="text-sm opacity-90">{entry.description}</div>}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">No hay eventos en este día</p>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  )
}
