import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Plus, Settings, LogOut, TrendingUp, TrendingDown, Loader, PieChart, Calendar } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient, fetchRecentActivity } from '../services/apiClient'
import { NotificationBell } from '../components/NotificationBell'
import { RecentMovementItem } from '../components/RecentMovementItem'
import { type RecentActivity } from '../types/activity'
import { AchievementsWidget } from '../components/AchievementsWidget'
import RequestActivity from './RequestActivity'
import RequestInbox from './RequestInbox'
import Tasks from './Tasks'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

interface Event {
  id: string
  type: string
  title?: string
  dateStart: string
  status: string
  pointsCalculated: string
  creator?: { id: string; name: string }
}

interface ChartPoint {
  idx: number
  date: string
  [key: string]: string | number
}

interface BalanceData {
  you: { id: string; name: string; balance: number }
  partner: { id: string; name: string; balance: number }
  difference: number
  isBalanced: boolean
}

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, couple, logout } = useAppStore()
  const [currentView, setCurrentView] = useState<'dashboard' | 'request' | 'inbox' | 'tasks'>(
    (location.state as any)?.openInbox ? 'inbox' : 'dashboard'
  )
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [events, setEvents] = useState<Event[]>([])
  const [pendingTaskCount, setPendingTaskCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [chartNames, setChartNames] = useState<{ you: string; partner: string }>({ you: 'Yo', partner: 'Pareja' })
  const [balance, setBalance] = useState<BalanceData | null>(null)

  // Fetch recent activities using React Query
  const { data: recentActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: fetchRecentActivity,
    staleTime: 5 * 60 * 1000,  // 5 min
    enabled: !!user?.id && !!couple?.id,
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [eventsResponse, taskLogsResponse, balanceResponse, chartResponse] = await Promise.all([
          apiClient.events.getAll(),
          apiClient.tasks.getAllLogs('pending'),
          apiClient.points.getBalance(),
          apiClient.points.getChartData(30),
        ])

        setEvents(eventsResponse.events || [])

        const allPendingLogs = taskLogsResponse.logs || []
        setPendingTaskCount(allPendingLogs.filter(
          (l: { completedBy?: { id: string } }) => l.completedBy?.id !== user?.id
        ).length)

        setBalance(balanceResponse)

        // Chart data comes ready from the server — no client-side processing needed
        setChartData(chartResponse.chartData || [])
        setChartNames({ you: chartResponse.youName || 'Yo', partner: chartResponse.partnerName || 'Pareja' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data'
        setError(message)
        console.error('Failed to load dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.id && couple?.id) {
      loadData()
    }
  }, [user?.id, couple?.id, refreshCounter])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userName = chartNames.you
  const partnerName = chartNames.partner

  // Numeric tick positions for 30-day chart; 29 = today
  const CHART_TICKS = [0, 5, 10, 15, 20, 25, 29]

  const handleBack = (dirty = true) => {
    setCurrentView('dashboard')
    if (dirty) setRefreshCounter(c => c + 1)
  }

  if (currentView === 'request') {
    return <RequestActivity onBack={() => handleBack()} />
  }

  if (currentView === 'inbox') {
    return <RequestInbox onBack={() => handleBack()} />
  }

  if (currentView === 'tasks') {
    return <Tasks onBack={() => handleBack()} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
              M
            </div>
            <h1 className="text-xl font-bold text-gray-900">Matripuntos</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
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
            <span className="ml-2 text-gray-600">Cargando datos...</span>
          </div>
        ) : (
          <>
            {/* Balance Section */}
            {balance && (
              <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 sm:p-6 text-white shadow-lg">
                <p className="text-indigo-100 text-sm font-medium mb-3">Balance actual de puntos</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold tracking-tight">
                      {balance.you.balance > 0 ? '+' : ''}{balance.you.balance.toFixed(1)}
                      <span className="text-xl ml-1 font-normal opacity-80">pts</span>
                    </p>
                    <p className="text-indigo-200 text-sm mt-1">{balance.you.name}</p>
                  </div>
                  <div className="text-right opacity-80">
                    <p className="text-3xl font-semibold">
                      {balance.partner.balance > 0 ? '+' : ''}{balance.partner.balance.toFixed(1)}
                      <span className="text-lg ml-1 font-normal opacity-70">pts</span>
                    </p>
                    <p className="text-indigo-200 text-sm mt-1">{balance.partner.name}</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-indigo-400/40 flex items-center gap-2">
                  {balance.isBalanced ? (
                    <span className="text-emerald-300 text-sm font-medium">✓ Relación equilibrada</span>
                  ) : (
                    <span className="text-yellow-200 text-sm font-medium">
                      ⚡ Diferencia: {balance.difference} pts
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Quick Actions */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
                <button
                  onClick={() => setCurrentView('request')}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3 hover:shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Solicitar Actividad
                </button>
                <button
                  onClick={() => setCurrentView('tasks')}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3 hover:shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Tareas del Hogar
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  className="w-full btn-secondary flex items-center justify-center gap-2 py-3 hover:shadow-md"
                >
                  <PieChart className="w-5 h-5" />
                  Estadísticas Básicas
                </button>
                <button
                  onClick={() => navigate('/analytics/advanced')}
                  className="w-full btn-secondary flex items-center justify-center gap-2 py-3 hover:shadow-md"
                >
                  <PieChart className="w-5 h-5" />
                  Analytics Avanzado
                </button>
                <button
                  onClick={() => setCurrentView('inbox')}
                  className="w-full btn-secondary flex items-center justify-center gap-2 py-3 hover:shadow-md"
                >
                  <BarChart3 className="w-5 h-5" />
                  Bandeja de Entrada
                  {(events.filter(e => e.status === 'pending').length + pendingTaskCount) > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {events.filter(e => e.status === 'pending').length + pendingTaskCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => navigate('/calendar')}
                  className="w-full btn-secondary flex items-center justify-center gap-2 py-3 hover:shadow-md"
                >
                  <Calendar className="w-5 h-5" />
                  Ver Calendario
                </button>
              </div>

              {/* Recent Activity */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Últimos Movimientos</h2>
                <div className="space-y-3">
                  {activitiesLoading && (
                    <div className="card flex items-center justify-center py-8">
                      <Loader className="w-5 h-5 text-primary animate-spin" />
                      <span className="ml-2 text-sm text-gray-600">Cargando movimientos...</span>
                    </div>
                  )}

                  {!activitiesLoading && recentActivities.length === 0 && (
                    <div className="card text-center py-8 text-gray-500">
                      No hay actividad reciente
                    </div>
                  )}

                  {!activitiesLoading && recentActivities.length > 0 && (
                    <div className="space-y-2">
                      {recentActivities.slice(0, 5).map((activity: RecentActivity) => (
                        <RecentMovementItem
                          key={`${activity.type}-${activity.id}`}
                          movement={activity}
                          onClick={() => {}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Graph */}
            {chartData.length > 0 && (
              <div className="card mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Evolución de puntos — últimos 30 días</h2>
                <p className="text-xs text-gray-400 mb-4">Saldo acumulado por persona</p>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="idx"
                        type="number"
                        domain={[0, 29]}
                        ticks={CHART_TICKS}
                        tickFormatter={(v: number) => chartData[v]?.date ?? ''}
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Días', position: 'insideBottom', offset: -12, fill: '#9ca3af', fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                        width={48}
                        label={{ value: 'Puntos', angle: -90, position: 'insideLeft', offset: 8, fill: '#9ca3af', fontSize: 11 }}
                      />
                      <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 2" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                        labelFormatter={(v: number) => chartData[v]?.date ?? ''}
                        formatter={(value: number, name: string) => [`${value > 0 ? '+' : ''}${value} pts`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Line type="monotone" dataKey={userName} stroke="#6366F1" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#6366F1' }} />
                      <Line type="monotone" dataKey={partnerName} stroke="#EC4899" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#EC4899' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Stats below chart */}
                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    {(balance?.you.balance || 0) >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-success" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-danger" />
                    )}
                    <div>
                      <p className="text-xs text-gray-600">{userName}</p>
                      <p className={`font-bold ${(balance?.you.balance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {(balance?.you.balance || 0) >= 0 ? '+' : ''}{balance?.you.balance.toFixed(1) || '0.0'} pts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {(balance?.partner.balance || 0) >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-success" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-danger" />
                    )}
                    <div>
                      <p className="text-xs text-gray-600">{partnerName}</p>
                      <p className={`font-bold ${(balance?.partner.balance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {(balance?.partner.balance || 0) >= 0 ? '+' : ''}{balance?.partner.balance.toFixed(1) || '0.0'} pts
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Achievements Widget */}
            <div className="mb-8">
              <AchievementsWidget />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
