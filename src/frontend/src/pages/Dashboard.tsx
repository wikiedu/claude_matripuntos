import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Plus, Settings, LogOut, TrendingUp, TrendingDown, Loader, PieChart, Calendar } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { NotificationBell } from '../components/NotificationBell'
import RequestActivity from './RequestActivity'
import RequestInbox from './RequestInbox'
import Tasks from './Tasks'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
  date: string
  [key: string]: string | number
}

interface PointsTransaction {
  id: string
  type: string
  amount: string
  description: string
  createdAt: string
  user?: { id: string; name: string }
}

interface BalanceData {
  you: { id: string; name: string; balance: number }
  partner: { id: string; name: string; balance: number }
  difference: number
  isBalanced: boolean
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, couple, logout } = useAppStore()
  const [currentView, setCurrentView] = useState<'dashboard' | 'request' | 'inbox' | 'tasks'>('dashboard')
  const [events, setEvents] = useState<Event[]>([])
  const [pendingTaskCount, setPendingTaskCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])

  // Load events, balance, and transactions on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch all events + pending task logs in parallel
        const [eventsResponse, taskLogsResponse] = await Promise.all([
          apiClient.events.getAll(),
          apiClient.tasks.getAllLogs('pending'),
        ])
        const allEvents: Event[] = eventsResponse.events || []
        setEvents(allEvents)

        // Count partner's pending task logs (tasks I need to verify)
        const allPendingLogs = taskLogsResponse.logs || []
        const partnerPending = allPendingLogs.filter(
          (l: { completedBy?: { id: string } }) => l.completedBy?.id !== user?.id
        )
        setPendingTaskCount(partnerPending.length)

        // Fetch balance data
        const balanceResponse = await apiClient.points.getBalance()
        setBalance(balanceResponse)

        // Fetch ALL transaction history to compute cumulative balances
        const allTimeResponse = await apiClient.points.getHistory({
          limit: 100,
        })
        const allTransactions = allTimeResponse.transactions || []
        setTransactions(allTransactions)

        const otherUser = couple?.users?.find(_u => _u.id !== user?.id)
        const userName = user?.name || 'Yo'
        const partnerName = otherUser?.name || 'Pareja'

        // Build a day-by-day cumulative chart for the last 30 days
        // First compute cumulative balance BEFORE the 30-day window
        const windowStart = new Date()
        windowStart.setDate(windowStart.getDate() - 29)
        windowStart.setHours(0, 0, 0, 0)

        const sorted = [...allTransactions].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )

        // Running totals from all time
        let userRunning = 0
        let partnerRunning = 0
        // Pre-seed: sum everything before our window
        sorted.forEach(t => {
          if (new Date(t.createdAt) < windowStart) {
            if (t.user?.id === user?.id) userRunning += Number(t.amount)
            else partnerRunning += Number(t.amount)
          }
        })

        // Build per-day delta map for the last 30 days
        const deltaMap: { [dateStr: string]: { user: number; partner: number } } = {}
        sorted.forEach(t => {
          const d = new Date(t.createdAt)
          if (d < windowStart) return
          const key = d.toISOString().split('T')[0]
          if (!deltaMap[key]) deltaMap[key] = { user: 0, partner: 0 }
          if (t.user?.id === user?.id) deltaMap[key].user += Number(t.amount)
          else deltaMap[key].partner += Number(t.amount)
        })

        // Generate one entry per day for the last 30 days
        const chartArray: ChartPoint[] = []
        for (let i = 29; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          d.setHours(0, 0, 0, 0)
          const key = d.toISOString().split('T')[0]
          const delta = deltaMap[key] || { user: 0, partner: 0 }
          userRunning += delta.user
          partnerRunning += delta.partner
          // Only add label every 5 days to avoid crowding, always add today
          const label = i === 0 ? 'Hoy' : i % 5 === 0 ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''
          chartArray.push({
            date: label || d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            [userName]: Math.round(userRunning),
            [partnerName]: Math.round(partnerRunning),
          })
        }
        setChartData(chartArray)
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
  }, [user?.id, couple?.id])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const otherUser = couple?.users?.find(_u => _u.id !== user?.id)
  const userName = user?.name || 'User 1'
  const partnerName = otherUser?.name || 'User 2'

  // Get recent events (last 3)
  if (currentView === 'request') {
    return <RequestActivity onBack={() => setCurrentView('dashboard')} />
  }

  if (currentView === 'inbox') {
    return <RequestInbox onBack={() => setCurrentView('dashboard')} />
  }

  if (currentView === 'tasks') {
    return <Tasks onBack={() => setCurrentView('dashboard')} />
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
            <span className="ml-2 text-gray-600">Cargando datos...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Your Balance */}
              <div className="card">
                <p className="text-gray-600 text-sm font-medium mb-2">TÚ ({balance?.you.name || userName})</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${(balance?.you.balance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {balance?.you.balance !== undefined ? balance.you.balance.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-gray-600">MATRIPUNTOS</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {balance && balance.you.balance >= 0 ? '↗️' : '↘️'} {balance?.you.balance !== undefined ? Math.abs(balance.you.balance).toFixed(1) : '0.0'} pts
                </p>
              </div>

              {/* Partner Balance */}
              <div className="card">
                <p className="text-gray-600 text-sm font-medium mb-2">ÉL/ELLA ({balance?.partner.name || partnerName})</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${(balance?.partner.balance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {balance?.partner.balance !== undefined ? balance.partner.balance.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-gray-600">MATRIPUNTOS</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {balance && balance.partner.balance >= 0 ? '↗️' : '↘️'} {balance?.partner.balance !== undefined ? Math.abs(balance.partner.balance).toFixed(1) : '0.0'} pts
                </p>
              </div>
            </div>

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
                  {transactions.length > 0 ? (
                    transactions.slice(0, 5).map(tx => {
                      const amount = Number(tx.amount)
                      const isPositive = amount >= 0
                      const typeLabel =
                        tx.type === 'task_completed' ? '🏠 Tarea' :
                        tx.type === 'event_accepted' ? '🎯 Actividad (coste)' :
                        tx.type === 'event_accepted_credit' ? '🎯 Actividad (ganado)' :
                        tx.type === 'forced_payment' ? '⚡ Forzado' :
                        tx.type === 'manual_adjustment' ? '✏️ Ajuste' : tx.type
                      return (
                        <div key={tx.id} className="card">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{tx.description}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {typeLabel} · {tx.user?.name || '?'} · {new Date(tx.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                            <span className={`ml-3 flex-shrink-0 text-sm font-bold px-2 py-1 rounded-lg ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {isPositive ? '+' : ''}{amount.toFixed(0)} pts
                            </span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="card text-center py-8 text-gray-500">
                      No hay movimientos todavía
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Graph */}
            {chartData.length > 0 && (
              <div className="card mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Últimos 30 Días</h2>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 inline-block" /> {userName}</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-pink-500 inline-block" /> {partnerName}</span>
                  </div>
                </div>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                        interval={4}
                      />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} width={40} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number, name: string) => [`${value} pts`, name]}
                      />
                      <Line
                        type="monotone"
                        dataKey={userName}
                        stroke="#6366F1"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, fill: '#6366F1' }}
                      />
                      <Line
                        type="monotone"
                        dataKey={partnerName}
                        stroke="#EC4899"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, fill: '#EC4899' }}
                      />
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
          </>
        )}
      </main>
    </div>
  )
}
