import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Plus, Settings, LogOut, TrendingUp, TrendingDown, Loader, PieChart } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { NotificationBell } from '../components/NotificationBell'
import RequestActivity from './RequestActivity'
import RequestInbox from './RequestInbox'
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
  const [currentView, setCurrentView] = useState<'dashboard' | 'request' | 'inbox'>('dashboard')
  const [events, setEvents] = useState<Event[]>([])
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

        // Fetch all events
        const eventsResponse = await apiClient.events.getAll()
        setEvents(eventsResponse.events || [])

        // Fetch balance data
        const balanceResponse = await apiClient.points.getBalance()
        setBalance(balanceResponse)

        // Fetch transaction history for the last 60 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 60)

        const historyResponse = await apiClient.points.getHistory({
          startDate: thirtyDaysAgo.toISOString(),
          endDate: new Date().toISOString(),
          limit: 100,
        })
        const allTransactions = historyResponse.transactions || []
        setTransactions(allTransactions)

        // Generate chart data from transactions
        const otherUser = couple?.users?.find(_u => _u.id !== user?.id)
        const userName = user?.name || 'User 1'
        const partnerName = otherUser?.name || 'User 2'

        // Group transactions by date and accumulate balances
        const balanceByDate: { [key: string]: { [key: string]: number } } = {}
        let userBalance = 0
        let partnerBalance = 0

        // Sort transactions by date (oldest first) to accumulate properly
        const sortedTransactions = [...allTransactions].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )

        sortedTransactions.forEach(transaction => {
          const date = new Date(transaction.createdAt)
          const dateKey = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })

          if (transaction.user?.id === user?.id) {
            userBalance += Number(transaction.amount)
          } else {
            partnerBalance += Number(transaction.amount)
          }

          if (!balanceByDate[dateKey]) {
            balanceByDate[dateKey] = {}
          }
          balanceByDate[dateKey][userName] = userBalance
          balanceByDate[dateKey][partnerName] = partnerBalance
        })

        // If no transactions, create initial chart data
        if (Object.keys(balanceByDate).length === 0) {
          const mockChart: ChartPoint[] = [
            { date: 'Hoy', [userName]: 0, [partnerName]: 0 },
          ]
          setChartData(mockChart)
        } else {
          // Convert to array and limit to last 10 dates
          const chartArray = Object.entries(balanceByDate)
            .map(([date, balances]) => ({ date, ...balances }))
            .slice(-10)
          setChartData(chartArray)
        }
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
  const recentEvents = events.slice(0, 3)

  if (currentView === 'request') {
    return <RequestActivity onBack={() => setCurrentView('dashboard')} />
  }

  if (currentView === 'inbox') {
    return <RequestInbox onBack={() => setCurrentView('dashboard')} />
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
                <button className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                  <Plus className="w-5 h-5" />
                  Registrar Tarea Hoy
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  className="w-full btn-secondary flex items-center justify-center gap-2 py-3 hover:shadow-md"
                >
                  <PieChart className="w-5 h-5" />
                  Ver Estadísticas
                </button>
                <button
                  onClick={() => setCurrentView('inbox')}
                  className="w-full btn-secondary flex items-center justify-center gap-2 py-3 hover:shadow-md"
                >
                  <BarChart3 className="w-5 h-5" />
                  Bandeja: {events.filter(e => e.status === 'pending').length} Pendientes
                </button>
              </div>

              {/* Recent Activity */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Últimas Actividades</h2>
                <div className="space-y-3">
                  {recentEvents.length > 0 ? (
                    recentEvents.map(event => (
                      <div key={event.id} className="card">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {event.title || event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {event.creator?.name || partnerName} • {new Date(event.dateStart).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <span className="badge-success">+{event.pointsCalculated}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="card text-center py-8 text-gray-500">
                      No hay actividades registradas
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Graph */}
            {chartData.length > 0 && (
              <div className="card mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Últimos 30 Días</h2>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey={userName}
                        stroke="#6366F1"
                        dot={{ fill: '#6366F1', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey={partnerName}
                        stroke="#EC4899"
                        dot={{ fill: '#EC4899', r: 4 }}
                        activeDot={{ r: 6 }}
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
