import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Award, Zap, Target } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { Alert } from '../components/Alert'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Loader } from 'lucide-react'

interface StatsData {
  equityScore: number
  totalTransactions: number
  totalPointsExchanged: number
  user1: { id: string; name: string; balance: number; percentage: number }
  user2: { id: string; name: string; balance: number; percentage: number }
  mostActiveMonth: string
  averageTransactionSize: number
}

interface Transaction {
  id: string
  type: string
  amount: string
  description: string
  createdAt: string
  user?: { id: string; name: string }
}

export default function Analytics() {
  const navigate = useNavigate()
  const { user, couple } = useAppStore()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Load stats
        try {
          const statsResponse = await apiClient.points.getStats()
          setStats(statsResponse)
        } catch (err) {
          console.warn('Stats not available:', err)
        }

        // Load transaction history (last 90 days) — limit max is 100
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        const historyResponse = await apiClient.points.getHistory({
          startDate: ninetyDaysAgo.toISOString(),
          endDate: new Date().toISOString(),
          limit: 100,
        })
        setTransactions(historyResponse.transactions || [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error cargando estadísticas'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.id && couple?.id) {
      loadAnalytics()
    }
  }, [user?.id, couple?.id])

  // Generate chart data from transactions (grouped by month)
  const generateChartData = () => {
    const groupedByMonth: { [key: string]: { [key: string]: number } } = {}

    transactions.forEach(transaction => {
      const date = new Date(transaction.createdAt)
      const monthKey = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      const userName = transaction.user?.name || 'Desconocido'

      if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = {}
      groupedByMonth[monthKey][userName] = (groupedByMonth[monthKey][userName] || 0) + Number(transaction.amount)
    })

    return Object.entries(groupedByMonth)
      .map(([month, data]) => ({ month, ...data }))
      .slice(-6)
  }

  // Get transaction types distribution (only positive transactions so it makes sense)
  const getTransactionTypes = () => {
    const types: { [key: string]: number } = {}
    transactions.filter(t => Number(t.amount) > 0).forEach(t => {
      const label =
        t.type === 'task_completed' ? '🏠 Tareas' :
        t.type === 'manual_adjustment' ? '✏️ Ajuste manual' :
        t.type === 'forced_payment' ? '⚡ Pagos forzados' : t.type
      types[label] = (types[label] || 0) + Math.abs(Number(t.amount))
    })
    return Object.entries(types)
      .map(([type, value]) => ({ name: type, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
  }

  const chartData = generateChartData()
  const transactionTypes = getTransactionTypes()
  const COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-primary animate-spin" />
          <span className="text-gray-600">Cargando análisis...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estadísticas Básicas</h1>
            <p className="text-sm text-gray-500">Últimos 90 días</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Equity Score */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Equidad</p>
                  <p className="text-3xl font-bold text-primary mt-2">{stats.equityScore}<span className="text-lg">/100</span></p>
                </div>
                <Award className="w-8 h-8 text-primary opacity-70" />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(stats.equityScore, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.equityScore >= 80 ? '¡Muy equilibrado!' : stats.equityScore >= 60 ? 'Bastante equilibrado' : 'Necesita más balance'}
              </p>
            </div>

            {/* Total Transactions */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Transacciones</p>
                  <p className="text-3xl font-bold text-success mt-2">{stats.totalTransactions}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-success opacity-70" />
              </div>
              <p className="text-xs text-gray-500 mt-4">Total registradas</p>
            </div>

            {/* Average Transaction */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Media por transacción</p>
                  <p className="text-3xl font-bold text-warning mt-2">{stats.averageTransactionSize.toFixed(1)}</p>
                </div>
                <Zap className="w-8 h-8 text-warning opacity-70" />
              </div>
              <p className="text-xs text-gray-500 mt-4">Puntos promedio</p>
            </div>

            {/* Total Points */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Puntos Totales</p>
                  <p className="text-3xl font-bold text-info mt-2">{stats.totalPointsExchanged}</p>
                </div>
                <Target className="w-8 h-8 text-info opacity-70" />
              </div>
              <p className="text-xs text-gray-500 mt-4">Intercambiados en total</p>
            </div>
          </div>
        )}

        {/* Empty state for stats */}
        {!stats && !isLoading && (
          <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-blue-700 text-sm">
              💡 Las métricas detalladas estarán disponibles cuando haya más actividad registrada.
            </p>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Balance by Month */}
          {chartData.length > 0 ? (
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Puntos netos por mes (últimos 6 meses)</h3>
              <p className="text-xs text-gray-400 mb-4">Suma de todas las transacciones (+tareas, −actividades) por persona</p>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tick={{ fill: '#6b7280' }} />
                    <YAxis stroke="#6b7280" fontSize={12} tick={{ fill: '#6b7280' }} label={{ value: 'Puntos', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => [`${value > 0 ? '+' : ''}${value} pts`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {Array.from(new Set(chartData.flatMap(d => Object.keys(d).filter(k => k !== 'month')))).map((key, idx) => (
                      <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="card flex items-center justify-center py-16 text-center">
              <div>
                <div className="text-4xl mb-3">📊</div>
                <p className="font-semibold text-gray-700">Sin datos todavía</p>
                <p className="text-sm text-gray-500">El gráfico aparecerá con más actividad</p>
              </div>
            </div>
          )}

          {/* Transaction Types Pie */}
          {transactionTypes.length > 0 ? (
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Distribución por tipo</h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={transactionTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {transactionTypes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="card flex items-center justify-center py-16 text-center">
              <div>
                <div className="text-4xl mb-3">🥧</div>
                <p className="font-semibold text-gray-700">Sin transacciones</p>
                <p className="text-sm text-gray-500">Empieza a registrar tareas y actividades</p>
              </div>
            </div>
          )}
        </div>

        {/* User Distribution */}
        {stats && (
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Distribución de puntos entre los dos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-900">{stats.user1.name}</p>
                  <span className="text-2xl font-bold text-primary">{stats.user1.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${stats.user1.percentage}%` }} />
                </div>
                <p className="text-sm text-gray-600">Saldo: <span className={`font-bold ${stats.user1.balance >= 0 ? 'text-success' : 'text-danger'}`}>{stats.user1.balance.toFixed(1)} pts</span></p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-900">{stats.user2.name}</p>
                  <span className="text-2xl font-bold text-pink-500">{stats.user2.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div className="bg-pink-500 h-3 rounded-full transition-all" style={{ width: `${stats.user2.percentage}%` }} />
                </div>
                <p className="text-sm text-gray-600">Saldo: <span className={`font-bold ${stats.user2.balance >= 0 ? 'text-success' : 'text-danger'}`}>{stats.user2.balance.toFixed(1)} pts</span></p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
