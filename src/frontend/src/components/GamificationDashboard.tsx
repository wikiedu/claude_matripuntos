import { useState, useEffect } from 'react'
import { apiClient } from '../services/apiClient'
import { TrendingUp, Award, Calendar, BarChart3, Flame } from 'lucide-react'

interface Stats {
  totalScore: number
  eventsAccepted: number
  eventsRejected: number
  eventsNegotiated: number
  avgPointsPerEvent: number
}

interface LeaderboardEntry {
  coupleId: string
  coupleName: string
  totalScore: number
  eventsAccepted: number
  rank: number
}

interface WeeklySummary {
  week: string
  eventsCreated: number
  eventsAccepted: number
  pointsEarned: number
  avgPointsPerEvent: number
}

export const GamificationDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGamificationData()
  }, [])

  const loadGamificationData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsRes, leaderboardRes, weeklyRes] = await Promise.all([
        apiClient.gamification.getCoupleStats(),
        apiClient.gamification.getLeaderboard(),
        apiClient.gamification.getWeeklySummary(),
      ])

      setStats(statsRes.stats)
      setLeaderboard(leaderboardRes.leaderboard)
      setWeeklySummary(weeklyRes.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gamification data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Cargando tablero...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded text-red-700">
        <p className="font-semibold">Error</p>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Flame size={32} className="text-orange-500" />
        <div>
          <h2 className="text-2xl font-bold">Tablero de Gamificación</h2>
          <p className="text-gray-600">Estadísticas y progreso de tu pareja</p>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Score */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <TrendingUp size={24} className="mb-2 opacity-80" />
            <div className="text-2xl font-bold">{stats.totalScore}</div>
            <div className="text-sm opacity-90">Puntos Totales</div>
          </div>

          {/* Events Accepted */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
            <Award size={24} className="mb-2 opacity-80" />
            <div className="text-2xl font-bold">{stats.eventsAccepted}</div>
            <div className="text-sm opacity-90">Eventos Acordados</div>
          </div>

          {/* Avg Points */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <BarChart3 size={24} className="mb-2 opacity-80" />
            <div className="text-2xl font-bold">{stats.avgPointsPerEvent}</div>
            <div className="text-sm opacity-90">Promedio por Evento</div>
          </div>

          {/* Events Negotiated */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
            <Calendar size={24} className="mb-2 opacity-80" />
            <div className="text-2xl font-bold">{stats.eventsNegotiated}</div>
            <div className="text-sm opacity-90">Negociados</div>
          </div>

          {/* Events Rejected */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
            <span className="text-2xl mb-2 block">❌</span>
            <div className="text-2xl font-bold">{stats.eventsRejected}</div>
            <div className="text-sm opacity-90">Rechazados</div>
          </div>
        </div>
      )}

      {/* Weekly Summary */}
      {weeklySummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Resumen de Esta Semana
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">{weeklySummary.eventsCreated}</div>
              <div className="text-sm text-blue-700">Eventos Creados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{weeklySummary.eventsAccepted}</div>
              <div className="text-sm text-green-700">Acordados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{weeklySummary.pointsEarned}</div>
              <div className="text-sm text-purple-700">Puntos Ganados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {weeklySummary.avgPointsPerEvent}
              </div>
              <div className="text-sm text-orange-700">Promedio</div>
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-4">{weeklySummary.week}</div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Award size={20} className="text-yellow-500" />
          Ranking Global
        </h3>

        {leaderboard.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.coupleId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  entry.rank === 1
                    ? 'bg-yellow-50 border border-yellow-200'
                    : entry.rank === 2
                      ? 'bg-gray-100 border border-gray-200'
                      : entry.rank === 3
                        ? 'bg-orange-50 border border-orange-200'
                        : 'bg-white border border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Medal */}
                  <div className="w-8 h-8 flex items-center justify-center font-bold">
                    {entry.rank === 1 && <span className="text-yellow-600 text-lg">🥇</span>}
                    {entry.rank === 2 && <span className="text-gray-600 text-lg">🥈</span>}
                    {entry.rank === 3 && <span className="text-orange-600 text-lg">🥉</span>}
                    {entry.rank > 3 && <span className="text-gray-600">#{entry.rank}</span>}
                  </div>

                  {/* Couple Info */}
                  <div>
                    <div className="font-semibold text-gray-900">{entry.coupleName}</div>
                    <div className="text-xs text-gray-600">{entry.eventsAccepted} eventos</div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{entry.totalScore}</div>
                  <div className="text-xs text-gray-600">puntos</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No hay parejas en el ranking aún</p>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadGamificationData}
        className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
      >
        🔄 Actualizar
      </button>
    </div>
  )
}
