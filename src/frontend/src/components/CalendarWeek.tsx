import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { toLocalDateString } from '../utils/dateUtils'

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

export const CalendarWeek: React.FC = () => {
  const { isAuthenticated } = useAppStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [weekDays, setWeekDays] = useState<Date[]>([])

  useEffect(() => {
    const today = new Date(currentDate)
    const firstDay = today.getDate() - today.getDay()
    const week = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today.setDate(firstDay + i))
      return new Date(date)
    })
    setWeekDays(week)
    fetchWeekCalendar()
  }, [currentDate, isAuthenticated])

  const getWeekNumber = (date: Date) => {
    const target = new Date(date)
    const dayNr = (target.getDay() + 6) % 7
    target.setDate(target.getDate() - dayNr + 3)
    const firstThursday = target.valueOf()
    target.setMonth(0, 4)
    const thursday = target.valueOf()
    return 1 + Math.round((firstThursday - thursday) / 604800000)
  }

  const fetchWeekCalendar = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const week = getWeekNumber(currentDate)
      const response = await apiClient.calendar.getWeek(year, week)
      setEntries(response.data?.entries || [])
    } catch (error) {
      console.error('Failed to fetch week calendar:', error)
    } finally {
      setLoading(false)
    }
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getEntriesForDay = (date: Date) => {
    const dateStr = toLocalDateString(date)
    return entries.filter(e => toLocalDateString(new Date(e.date)) === dateStr)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  if (weekDays.length === 0) return null

  const startDate = weekDays[0].toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  })
  const endDate = weekDays[6].toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          Semana de {startDate} a {endDate}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Semana anterior"
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
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Próxima semana"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, idx) => {
          const dayEntries = getEntriesForDay(date)
          const today = isToday(date)

          return (
            <div
              key={idx}
              className={`rounded-lg border-2 p-4 min-h-[200px] ${
                today ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {/* Day header */}
              <div className="mb-3">
                <div className={`text-sm font-bold ${today ? 'text-blue-600' : 'text-gray-600'}`}>
                  {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                </div>
                <div className={`text-2xl font-bold ${today ? 'text-blue-600' : 'text-gray-800'}`}>
                  {date.getDate()}
                </div>
              </div>

              {/* Events */}
              <div className="space-y-2">
                {dayEntries.length > 0 ? (
                  dayEntries.map(entry => (
                    <div
                      key={entry.id}
                      className={`p-2 rounded text-white text-xs font-bold cursor-pointer hover:opacity-80 transition ${
                        typeColors[entry.type]
                      }`}
                      title={entry.title}
                    >
                      <div className="flex items-start gap-1">
                        <span>{typeEmojis[entry.type]}</span>
                        <span className="truncate">{entry.title}</span>
                      </div>
                      {entry.description && (
                        <div className="text-xs opacity-90 mt-1 line-clamp-2">{entry.description}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-xs italic">Sin eventos</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  )
}
