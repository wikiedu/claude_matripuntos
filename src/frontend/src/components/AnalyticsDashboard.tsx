import React, { useState, useEffect } from 'react'
import { TrendingUp, Users, Target, Trophy, BarChart3, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { AnalyticsChart } from './AnalyticsChart'
import { StatCard } from './StatCard'

interface CoupleMetrics {
  totalEvents: number
  totalPoints: number
  averagePointsPerEvent: number
  negotiationSuccessRate: number
  averageNegotiationRounds: number
  mostActiveDay: string
  totalAchievements: number
}

interface UserStat {
  userId: string
  userName: string
  totalPoints: number
  totalEvents: number
  totalCompleted: number
  successRate: number
  achievements: number
}

interface NegotiationStats {
  totalNegotiations: number
  accepted: number
  rejected: number
  successRate: number
  averageRounds: number
}

type PeriodType = 'this_week' | 'this_month' | 'prev_week' | 'prev_month'

export const AnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAppStore()
  const [period, setPeriod] = useState<PeriodType>('this_month')
  const [metrics, setMetrics] = useState<CoupleMetrics | null>(null)
  const [userStats, setUserStats] = useState<UserStat[]>([])
  const [negotiationStats, setNegotiationStats] = useState<NegotiationStats | null>(null)
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [pointsByCategory, setPointsByCategory] = useState<Record<string, number>>({})
  const [_loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics()
    }
  }, [period, isAuthenticated])

  const getDateRange = () => {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (period === 'this_week') {
      // Monday of current week to today
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      startDate = new Date(now)
      startDate.setDate(now.getDate() - diff)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now)
    } else if (period === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now)
    } else if (period === 'prev_week') {
      // Full previous Mon–Sun
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      endDate = new Date(now)
      endDate.setDate(now.getDate() - diff - 1)
      endDate.setHours(23, 59, 59, 999)
      startDate = new Date(endDate)
      startDate.setDate(endDate.getDate() - 6)
      startDate.setHours(0, 0, 0, 0)
    } else {
      // prev_month: full previous calendar month
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }
  }

  const fetchAnalytics = async () => {
    if (!isAuthenticated) return
    setLoading(true)

    try {
      const { startDate, endDate } = getDateRange()

      const [metricsRes, usersRes, negotiationsRes, weeklyRes, categoryRes] = await Promise.all([
        apiClient.analytics.getCouple(startDate, endDate),
        apiClient.analytics.getUsers(startDate, endDate),
        apiClient.analytics.getNegotiations(startDate, endDate),
        apiClient.analytics.getWeeklyTrends(),
        apiClient.analytics.getPointsByCategory(startDate, endDate),
      ])

      setMetrics(metricsRes.data)
      setUserStats(usersRes.data)
      setNegotiationStats(negotiationsRes.data)
      setWeeklyData(weeklyRes.data)
      setPointsByCategory(categoryRes.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Analytics Avanzado</h1>
            <p className="text-gray-600">Análisis detallado de tu relación en números</p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex flex-wrap gap-2 mb-8">
          {([
            { key: 'this_week', label: 'Esta semana' },
            { key: 'this_month', label: 'Este mes' },
            { key: 'prev_week', label: 'Semana anterior' },
            { key: 'prev_month', label: 'Mes anterior' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-4 py-2 rounded-lg font-bold transition ${
                period === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Target}
            label="Total de Eventos"
            value={metrics.totalEvents}
            unit=""
            trend={metrics.totalEvents > 0 ? '+' : ''}
          />
          <StatCard
            icon={TrendingUp}
            label="Puntos Totales"
            value={Math.round(metrics.totalPoints)}
            unit="pts"
            trend={metrics.totalPoints > 0 ? '+' : ''}
          />
          <StatCard
            icon={Users}
            label="Tasa de Éxito"
            value={Math.round(metrics.negotiationSuccessRate)}
            unit="%"
            trend={metrics.negotiationSuccessRate > 0 ? '+' : ''}
          />
          <StatCard
            icon={Trophy}
            label="Logros Desbloqueados"
            value={metrics.totalAchievements}
            unit=""
            trend={metrics.totalAchievements > 0 ? '+' : ''}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Trends */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Tendencia Semanal
            </h2>
            <AnalyticsChart data={weeklyData} type="weekly" />
          </div>

          {/* Points by Category */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 size={20} />
              Puntos por Tipo
            </h2>
            <div className="space-y-3">
              {Object.entries(pointsByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([type, points]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-gray-700 capitalize">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${
                              (points /
                                Math.max(...Object.values(pointsByCategory))) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-right w-16 font-bold">{Math.round(points)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* User Comparison */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Users size={20} />
            Comparativa por Usuario
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userStats.map(user => (
              <div key={user.userId} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4 text-blue-600">{user.userName}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Eventos Completados</span>
                    <span className="font-bold">
                      {user.totalCompleted} / {user.totalEvents}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Puntos Totales</span>
                    <span className="font-bold text-lg">{Math.round(user.totalPoints)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tasa de Éxito</span>
                    <span className="font-bold text-green-600">{Math.round(user.successRate)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Logros</span>
                    <span className="font-bold">{user.achievements}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-sm text-gray-600">Promedio por evento</div>
                    <div className="text-2xl font-bold text-blue-500">
                      {user.totalEvents > 0 ? (user.totalPoints / user.totalEvents).toFixed(1) : '0'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Negotiation Stats */}
        {negotiationStats && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-6">Estadísticas de Negociación</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-l-4 border-green-500 pl-4">
                <p className="text-gray-600 text-sm">Aceptadas</p>
                <p className="text-3xl font-bold text-green-600">{negotiationStats.accepted}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(negotiationStats.successRate)}% de tasa de éxito
                </p>
              </div>
              <div className="border-l-4 border-red-500 pl-4">
                <p className="text-gray-600 text-sm">Rechazadas</p>
                <p className="text-3xl font-bold text-red-600">{negotiationStats.rejected}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {negotiationStats.totalNegotiations} negociaciones totales
                </p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-gray-600 text-sm">Rondas Promedio</p>
                <p className="text-3xl font-bold text-blue-600">
                  {negotiationStats.averageRounds.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Máximo 2 rondas permitidas
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
