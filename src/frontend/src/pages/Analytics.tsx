import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Award, Zap, Target, Lock } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { Card, CardTitle, CardContent } from '../components/Card'
import { Alert } from '../components/Alert'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
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
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Try to load stats (might fail if not premium)
        try {
          const statsResponse = await apiClient.points.getStats()
          setStats(statsResponse)
          setIsPremium(true)
        } catch (err) {
          // Not premium, show upgrade message
          setIsPremium(false)
        }

        // Load transaction history
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        const historyResponse = await apiClient.points.getHistory({
          startDate: ninetyDaysAgo.toISOString(),
          endDate: new Date().toISOString(),
          limit: 200,
        })
        setTransactions(historyResponse.transactions || [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load analytics'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.id && couple?.id) {
      loadAnalytics()
    }
  }, [user?.id, couple?.id])

  // Generate chart data from transactions
  const generateChartData = () => {
    const groupedByMonth: { [key: string]: { [key: string]: number } } = {}

    transactions.forEach(transaction => {
      const date = new Date(transaction.createdAt)
      const monthKey = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      const userName = transaction.user?.name || 'Unknown'

      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = {}
      }

      groupedByMonth[monthKey][userName] = (groupedByMonth[monthKey][userName] || 0) + Number(transaction.amount)
    })

    return Object.entries(groupedByMonth)
      .map(([month, data]) => ({ month, ...data }))
      .slice(-6) // Last 6 months
  }

  // Get transaction types distribution
  const getTransactionTypes = () => {
    const types: { [key: string]: number } = {}
    transactions.forEach(t => {
      types[t.type] = (types[t.type] || 0) + 1
    })

    return Object.entries(types)
      .map(([type, count]) => ({ name: type, value: count }))
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
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Estadísticas</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {!isPremium && (
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-4">
              <Lock className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Función Premium</h3>
                <p className="text-gray-700 mb-4">
                  Las estadísticas avanzadas están disponibles en la versión Premium. Actualiza tu plan para acceder a análisis detallados, predicciones y más.
                </p>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                  Actualizar a Premium
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && isPremium && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Equity Score */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Equity Score</p>
                  <p className="text-3xl font-bold text-primary mt-2">{stats.equityScore}</p>
                </div>
                <Award className="w-8 h-8 text-primary" />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${stats.equityScore}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.equityScore >= 80
                  ? '¡Perfectamente equilibrado!'
                  : stats.equityScore >= 60
                    ? 'Bastante equilibrado'
                    : 'Requiere más balance'}
              </p>
            </div>

            {/* Total Transactions */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Transacciones</p>
                  <p className="text-3xl font-bold text-success mt-2">{stats.totalTransactions}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
              <p className="text-xs text-gray-500 mt-4">En total</p>
            </div>

            {/* Average Transaction */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Transacción Promedio</p>
                  <p className="text-3xl font-bold text-warning mt-2">{stats.averageTransactionSize.toFixed(1)}</p>
                </div>
                <Zap className="w-8 h-8 text-warning" />
              </div>
              <p className="text-xs text-gray-500 mt-4">Puntos promedio</p>
            </div>

            {/* Total Points */}
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Puntos Intercambiados</p>
                  <p className="text-3xl font-bold text-info mt-2">{stats.totalPointsExchanged}</p>
                </div>
                <Target className="w-8 h-8 text-info" />
              </div>
              <p className="text-xs text-gray-500 mt-4">En total</p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Balance Over Time */}
          {chartData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Balance Histórico (últimos 6 meses)</h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    {Array.from(new Set(chartData.flatMap(d => Object.keys(d)))).map((key, idx) => {
                      if (key !== 'month') {
                        return (
                          <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} />
                        )
                      }
                      return null
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Transaction Types */}
          {transactionTypes.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Tipos de Transacciones</h3>
              <div className="w-full h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={transactionTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {transactionTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* User Distribution */}
        {stats && isPremium && (
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Distribución de Puntos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-medium text-gray-900">{stats.user1.name}</p>
                  <span className="text-2xl font-bold text-primary">{stats.user1.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${stats.user1.percentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">Balance: {stats.user1.balance.toFixed(1)} pts</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-medium text-gray-900">{stats.user2.name}</p>
                  <span className="text-2xl font-bold text-pink-500">{stats.user2.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-pink-500 h-3 rounded-full transition-all"
                    style={{ width: `${stats.user2.percentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">Balance: {stats.user2.balance.toFixed(1)} pts</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
