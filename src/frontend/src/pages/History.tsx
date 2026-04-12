import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Download, Filter, Loader } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { Button } from '../components/Button'
import { Alert } from '../components/Alert'
import { Card, CardTitle, CardContent, CardDescription } from '../components/Card'
import { formatLocalDate } from '../utils/dateUtils'

interface Transaction {
  id: string
  type: string
  amount: string
  description: string
  user: { id: string; name: string } | null
  createdAt: string
  event?: {
    id: string
    type: string
    title: string
    date: string
  } | null
  taskLog?: {
    id: string
    taskName: string
    date: string
  } | null
}

interface BalanceData {
  you: { name: string; balance: number }
  partner: { name: string; balance: number }
  difference: number
  isBalanced: boolean
}

interface PageProps {
  onBack?: () => void
}

export default function History({ onBack }: PageProps) {
  const navigate = useNavigate()
  const { couple } = useAppStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  })

  // Load balance and history
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch balance
        const balanceResponse = await apiClient.points.getBalance()
        setBalance(balanceResponse)

        // Fetch transactions
        const historyResponse = await apiClient.points.getHistory({
          limit: 50,
          type: filterType === 'all' ? undefined : filterType,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
        })
        setTransactions(historyResponse.transactions || [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar el historial'
        setError(message)
        console.error('Failed to load history:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (couple?.id) {
      loadData()
    }
  }, [couple?.id, filterType, dateRange])

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'event_accepted':
      case 'event_forced':
        return <TrendingDown className="w-5 h-5 text-red-500" />
      case 'task_completed':
        return <TrendingUp className="w-5 h-5 text-green-500" />
      default:
        return <TrendingUp className="w-5 h-5 text-blue-500" />
    }
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'event_accepted':
        return 'Actividad aceptada'
      case 'event_forced':
        return 'Actividad forzada'
      case 'task_completed':
        return 'Tarea completada'
      case 'donation':
        return 'Donación de puntos'
      case 'forced_payment':
        return 'Pago forzado'
      default:
        return type
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack ? (
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            ) : (
              <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">Historial de Puntos</h1>
          </div>
          <Button variant="secondary" size="sm">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {/* Balance Summary */}
        {balance && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* User 1 Balance */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <CardDescription>Tu balance</CardDescription>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {balance.you.balance > 0 ? '+' : ''}{balance.you.balance}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{balance.you.name}</p>
                </div>
                {balance.you.balance > 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : balance.you.balance < 0 ? (
                  <TrendingDown className="w-8 h-8 text-red-500" />
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center text-gray-400 font-bold">
                    =
                  </div>
                )}
              </div>
            </Card>

            {/* Balance Difference */}
            <Card className="bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardDescription>Diferencia</CardDescription>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {balance.difference.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {balance.isBalanced ? 'Equilibrado ✓' : 'Necesita equilibrarse'}
                  </p>
                </div>
                <div className="w-8 h-8 flex items-center justify-center">
                  {balance.isBalanced ? (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-yellow-500" />
                  )}
                </div>
              </div>
            </Card>

            {/* Partner Balance */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <CardDescription>Balance de tu pareja</CardDescription>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {balance.partner.balance > 0 ? '+' : ''}{balance.partner.balance}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{balance.partner.name}</p>
                </div>
                {balance.partner.balance > 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : balance.partner.balance < 0 ? (
                  <TrendingDown className="w-8 h-8 text-red-500" />
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center text-gray-400 font-bold">
                    =
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-8">
          <CardTitle className="text-lg mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Tipo de transacción
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todas las transacciones</option>
                  <option value="event_accepted">Actividades</option>
                  <option value="task_completed">Tareas</option>
                  <option value="donation">Donaciones</option>
                  <option value="forced_payment">Pagos forzados</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Desde
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Hasta
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction List */}
        <Card>
          <CardTitle className="text-lg mb-4">Historial de transacciones</CardTitle>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-blue-600 animate-spin mr-2" />
                <span className="text-gray-600">Cargando transacciones...</span>
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay transacciones. ¡Crea actividades o registra tareas para empezar!
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {getTransactionIcon(transaction.type)}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {getTransactionLabel(transaction.type)}
                        </p>
                        {transaction.event && (
                          <p className="text-sm text-gray-600">
                            {transaction.event.title || transaction.event.type}
                          </p>
                        )}
                        {transaction.taskLog && (
                          <p className="text-sm text-gray-600">
                            {transaction.taskLog.taskName}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatLocalDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        Number(transaction.amount) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Number(transaction.amount) > 0 ? '+' : ''}{transaction.amount}
                      </p>
                      <p className="text-xs text-gray-500">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// Missing imports for Balance card
import { AlertCircle, CheckCircle } from 'lucide-react'
