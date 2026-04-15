import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Plus, Settings, LogOut, TrendingUp, TrendingDown, Loader, PieChart, Calendar, Sun, Moon } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient, fetchRecentActivity } from '../services/apiClient'
import { NotificationBell } from '../components/NotificationBell'
import { RecentMovementItem } from '../components/RecentMovementItem'
import { type RecentActivity } from '../types/activity'
import { AchievementsWidget } from '../components/AchievementsWidget'
import { BottomNav } from '../components/BottomNav'
import { StreakWidget } from '../components/StreakWidget'
import { useShoppingList } from '../hooks/useShoppingList'
import { useTodos } from '../hooks/useTodos'
import { LevelProgress } from '../components/LevelProgress'
import { Avatar } from '../components/Avatar'
import { getDailyPhrase } from '../utils/dailyPhrase'
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
  partner?: { id: string; name: string; balance: number } | null
  difference: number
  isBalanced: boolean
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, couple, logout, toggleTheme, theme } = useAppStore()
  const [refreshCounter] = useState(0)
  const [events, setEvents] = useState<Event[]>([])
  const [pendingTaskCount, setPendingTaskCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [chartNames, setChartNames] = useState<{ you: string; partner: string | null }>({ you: 'Yo', partner: null })
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [partnerMood, setPartnerMood] = useState<string | null>(null)
  const [partnerDisplayName, setPartnerDisplayName] = useState<string | null>(null)
  const dailyPhrase = getDailyPhrase()
  const { data: shoppingData } = useShoppingList()
  const { data: todosData } = useTodos()
  const pendingShoppingCount = shoppingData?.active?.items.filter(i => !i.isChecked).length ?? 0
  const pendingTodosCount = todosData?.mine.filter(t => !t.isCompleted).length ?? 0

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

        const [eventsResponse, taskLogsResponse, balanceResponse, chartResponse, meResponse] = await Promise.all([
          apiClient.events.getAll(),
          apiClient.tasks.getAllLogs('pending'),
          apiClient.points.getBalance(),
          apiClient.points.getChartData(30),
          apiClient.auth.getMe(),
        ])

        setEvents(eventsResponse.events || [])

        const allPendingLogs = taskLogsResponse.logs || []
        setPendingTaskCount(allPendingLogs.filter(
          (l: { completedBy?: { id: string } }) => l.completedBy?.id !== user?.id
        ).length)

        setBalance(balanceResponse)

        // Chart data comes ready from the server — no client-side processing needed
        setChartData(chartResponse.chartData || [])
        setChartNames({ you: chartResponse.youName || 'Yo', partner: chartResponse.partnerName ?? null })

        // Partner mood from /me response
        if (meResponse?.partnerMood) setPartnerMood(meResponse.partnerMood)
        if (meResponse?.partnerName) setPartnerDisplayName(meResponse.partnerName)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data'
        setError(message)
        console.error('Failed to load dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.id) {
      if (couple?.id) {
        loadData()
      } else {
        // User has no couple yet — stop the spinner and show an empty state
        setIsLoading(false)
      }
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--matri-bg)', paddingBottom: 72 }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px' }}>
        <div>
          <h1 style={{ color: 'var(--matri-text)', fontWeight: 700, fontSize: 16 }}>
            Hola, {user?.name?.split(' ')[0]} ☀️
          </h1>
          {partnerMood && partnerDisplayName && (
            <p style={{ color: 'var(--matri-text-3)', fontSize: 11, marginTop: 2 }}>
              {partnerDisplayName} está {partnerMood} hoy
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={async () => {
              toggleTheme()
              const newTheme = theme === 'dark' ? 'light' : 'dark'
              await apiClient.profile.updateMe({ theme: newTheme })
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--matri-text-2)', padding: 4 }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NotificationBell />
          <Avatar
            emoji={user?.avatarEmoji ?? '🐼'}
            color={user?.avatarColor ?? '#7c3aed'}
            mood={user?.currentMood}
            size="md"
            interactive
            onMoodChange={async (mood) => {
              await apiClient.profile.updateMe({ currentMood: mood })
              useAppStore.setState((s: any) => ({
                user: s.user ? { ...s.user, currentMood: mood } : s.user
              }))
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 768, margin: '0 auto', padding: '4px 0' }}>
        {/* Error Alert */}
        {error && (
          <div style={{ margin: '0 16px 12px', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <Loader className="w-8 h-8 text-primary animate-spin" />
            <span style={{ marginLeft: 8, color: 'var(--matri-text-2)' }}>Cargando datos...</span>
          </div>
        ) : (
          <>
            {/* Balance Section */}
            {balance && (
              <div style={{ margin: '0 16px 12px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 16, padding: '16px', boxShadow: '0 4px 24px rgba(79,70,229,0.3)' }}>
                <p style={{ color: 'rgba(199,210,254,0.8)', fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Balance actual de puntos</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#fff', fontSize: 32, fontWeight: 700, letterSpacing: '-0.5px' }}>
                      {balance.you.balance > 0 ? '+' : ''}{balance.you.balance.toFixed(1)}
                      <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.8, marginLeft: 4 }}>pts</span>
                    </p>
                    <p style={{ color: 'rgba(199,210,254,0.8)', fontSize: 12, marginTop: 2 }}>{balance.you.name}</p>
                  </div>
                  {balance.partner && (
                    <div style={{ textAlign: 'right', opacity: 0.8 }}>
                      <p style={{ color: '#fff', fontSize: 24, fontWeight: 600 }}>
                        {balance.partner.balance > 0 ? '+' : ''}{balance.partner.balance.toFixed(1)}
                        <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.7, marginLeft: 4 }}>pts</span>
                      </p>
                      <p style={{ color: 'rgba(199,210,254,0.8)', fontSize: 12, marginTop: 2 }}>{balance.partner.name}</p>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {balance.isBalanced ? (
                    <span style={{ color: '#6ee7b7', fontSize: 12, fontWeight: 500 }}>✓ Relación equilibrada</span>
                  ) : (
                    <span style={{ color: '#fde68a', fontSize: 12, fontWeight: 500 }}>
                      ⚡ Diferencia: {balance.difference} pts
                    </span>
                  )}
                </div>
                {/* Equity bar — only visible when there's a meaningful imbalance */}
                {!balance.isBalanced && (
                  <div style={{ marginTop: 8 }}>
                    {(() => {
                      const pos = Math.max(0, balance.you.balance)
                      const total = Math.max(0, balance.you.balance) + Math.max(0, balance.partner?.balance ?? 0)
                      const youPct = total === 0 ? 50 : Math.round((pos / total) * 100)
                      return (
                        <div style={{ width: '100%', height: 6, background: 'rgba(99,102,241,0.4)', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{ height: '100%', background: 'rgba(255,255,255,0.7)', borderRadius: 3, transition: 'width 0.5s', width: `${Math.min(Math.max(youPct, 5), 95)}%` }}
                          />
                        </div>
                      )
                    })()}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ color: 'rgba(199,210,254,0.7)', fontSize: 10 }}>{balance.you.name}</span>
                      {balance.partner && <span style={{ color: 'rgba(199,210,254,0.7)', fontSize: 10 }}>{balance.partner.name}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* v1.2 Gamification */}
            <div className="space-y-3 px-4 pb-3">
              <LevelProgress />
              <StreakWidget />
              {/* v1.3 La Casa quick access */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 4 }}>
                <button
                  onClick={() => navigate('/shopping')}
                  style={{
                    background: 'rgba(168,85,247,0.08)',
                    border: '1px solid rgba(168,85,247,0.2)',
                    borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>🛒</div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--matri-text)', marginBottom: 2 }}>Lista de la compra</p>
                  <p style={{ fontSize: 10, color: 'var(--matri-text-3)' }}>
                    {pendingShoppingCount > 0 ? `${pendingShoppingCount} pendientes` : 'Todo comprado ✓'}
                  </p>
                </button>
                <button
                  onClick={() => navigate('/todos')}
                  style={{
                    background: 'rgba(96,165,250,0.08)',
                    border: '1px solid rgba(96,165,250,0.2)',
                    borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>📝</div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--matri-text)', marginBottom: 2 }}>To-dos</p>
                  <p style={{ fontSize: 10, color: 'var(--matri-text-3)' }}>
                    {pendingTodosCount > 0 ? `${pendingTodosCount} pendientes` : 'Todo al día ✓'}
                  </p>
                </button>
              </div>
            </div>

            {/* Frase del día */}
            <div
              style={{
                background: 'rgba(245,158,11,0.07)',
                border: '1px solid rgba(245,158,11,0.18)',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 12,
                marginLeft: 16,
                marginRight: 16,
              }}
            >
              <p style={{ color: 'var(--matri-amber)', fontSize: 9, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 3 }}>
                Frase del día
              </p>
              <p style={{ color: 'var(--matri-text)', fontSize: 12, fontStyle: 'italic', lineHeight: 1.5 }}>
                "{dailyPhrase}"
              </p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24, padding: '0 16px' }}>
              {/* Quick Actions */}
              <div className="space-y-3">
                <h2 style={{ color: 'var(--matri-text)', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Acciones Rápidas</h2>
                <button
                  onClick={() => navigate('/request-activity')}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3 hover:shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Solicitar Actividad
                </button>
                <button
                  onClick={() => navigate('/tasks')}
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
                  onClick={() => navigate('/inbox')}
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
                <h2 style={{ color: 'var(--matri-text)', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Últimos Movimientos</h2>
                <div className="space-y-3">
                  {activitiesLoading && (
                    <div style={{ background: 'var(--matri-card-bg)', border: '1px solid var(--matri-card-border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
                      <Loader className="w-5 h-5 text-primary animate-spin" />
                      <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--matri-text-2)' }}>Cargando movimientos...</span>
                    </div>
                  )}

                  {!activitiesLoading && recentActivities.length === 0 && (
                    <div style={{ background: 'var(--matri-card-bg)', border: '1px solid var(--matri-card-border)', borderRadius: 10, textAlign: 'center', padding: '24px 0', color: 'var(--matri-text-2)', fontSize: 13 }}>
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
            <div style={{ background: 'var(--matri-card-bg)', border: '1px solid var(--matri-card-border)', borderRadius: 14, padding: '16px', margin: '0 16px 24px' }}>
                <h2 style={{ color: 'var(--matri-text)', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Evolución de puntos — últimos 30 días</h2>
                <p style={{ color: 'var(--matri-text-3)', fontSize: 11, marginBottom: 12 }}>Saldo acumulado por persona</p>
                <div className="relative w-full h-72">
                  {chartData.length > 0 && chartData.every(p => (p[userName] as number || 0) === 0 && (p[partnerName as string] as number || 0) === 0) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <p style={{ fontSize: 13, color: 'var(--matri-text-2)', background: 'var(--matri-card-bg)', padding: '4px 12px', borderRadius: 20 }}>
                        Aún no hay movimientos registrados
                      </p>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="idx"
                        type="number"
                        domain={[0, 29]}
                        ticks={CHART_TICKS}
                        tickFormatter={(v: number) => chartData[v]?.date ?? ''}
                        stroke="var(--matri-text-3)"
                        tick={{ fontSize: 11, fill: 'var(--matri-text-3)' }}
                        label={{ value: 'Días', position: 'insideBottom', offset: -12, fill: 'var(--matri-text-3)', fontSize: 11 }}
                      />
                      <YAxis
                        stroke="var(--matri-text-3)"
                        tick={{ fontSize: 11, fill: 'var(--matri-text-3)' }}
                        width={48}
                        label={{ value: 'Puntos', angle: -90, position: 'insideLeft', offset: 8, fill: 'var(--matri-text-3)', fontSize: 11 }}
                      />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--matri-card-bg)', border: '1px solid var(--matri-card-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--matri-text)' }}
                        labelFormatter={(v: number) => chartData[v]?.date ?? ''}
                        formatter={(value: number, name: string) => [`${value > 0 ? '+' : ''}${value} pts`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: 'var(--matri-text-2)' }} />
                      <Line type="monotone" dataKey={userName} stroke="#6366F1" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#6366F1' }} />
                      {partnerName && (
                        <Line type="monotone" dataKey={partnerName} stroke="#EC4899" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#EC4899' }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Stats below chart */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--matri-card-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {(balance?.you.balance || 0) >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-success" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-danger" />
                    )}
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--matri-text-2)' }}>{userName}</p>
                      <p className={`font-bold ${(balance?.you.balance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {(balance?.you.balance || 0) >= 0 ? '+' : ''}{balance?.you.balance.toFixed(1) || '0.0'} pts
                      </p>
                    </div>
                  </div>
                  {balance?.partner && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {(balance?.partner.balance || 0) >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-success" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-danger" />
                      )}
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--matri-text-2)' }}>{partnerName}</p>
                        <p className={`font-bold ${(balance?.partner.balance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                          {(balance?.partner.balance || 0) >= 0 ? '+' : ''}{balance?.partner.balance.toFixed(1) || '0.0'} pts
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            {/* Achievements Widget */}
            <div style={{ margin: '0 16px 24px' }}>
              <AchievementsWidget />
            </div>

            {/* Logout fallback (hidden in nav but accessible) */}
            <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => navigate('/settings')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--matri-text-3)', padding: 8 }}
                title="Ajustes"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--matri-text-3)', padding: 8 }}
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
