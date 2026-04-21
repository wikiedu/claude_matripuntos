import { useQuery } from '@tanstack/react-query'
import { WeeklyBarsChart } from './charts/WeeklyBarsChart'
import { CategoryPieChart } from './charts/CategoryPieChart'
import { BalanceEvolutionChart } from './charts/BalanceEvolutionChart'
import { TimeInvestedChart } from './charts/TimeInvestedChart'
import { fetchAnalytics } from './analyticsUtils'
import { apiClient } from '../../../services/apiClient'
import { useAppStore } from '../../../store/useAppStore'

// Palette mirrors CategoryFilterStrip — keeps pie matching the Tasks filter colors.
const CAT_COLORS: Record<string, string> = {
  cocina: '#f59e0b', limpieza: '#a855f7', baños: '#06b6d4', compra: '#10b981',
  logistica: '#6366f1', cuidado: '#ec4899', mantenimiento: '#f97316',
  jardineria: '#84cc16', mascotas: '#ef4444', other: '#9ca3af',
}
const CAT_EMOJI: Record<string, string> = {
  cocina: '🍳', limpieza: '🧹', baños: '🛁', compra: '🛒', logistica: '📋',
  cuidado: '👶', mantenimiento: '🔧', jardineria: '🌿', mascotas: '🐾', other: '📦',
}
const CAT_LABEL: Record<string, string> = {
  cocina: 'Cocina', limpieza: 'Limpieza', baños: 'Baños', compra: 'Compra',
  logistica: 'Logística', cuidado: 'Cuidado', mantenimiento: 'Mantenimiento',
  jardineria: 'Jardinería', mascotas: 'Mascotas', other: 'Otros',
}

const DOW = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

// Turn unknown slugs like "salida_y_amigos" into "Salida Y Amigos" so the UI
// never shows raw underscores to the user (B5).
function prettifySlug(slug: string): string {
  if (!slug) return 'Otros'
  return slug
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function normalizeCats(raw: unknown) {
  if (!raw || typeof raw !== 'object') return []
  const entries = Object.entries(raw as Record<string, number>)
    .filter(([, v]) => typeof v === 'number' && v > 0)
  return entries.map(([key, value]) => {
    const k = key.toLowerCase()
    return {
      name: CAT_LABEL[k] ?? prettifySlug(key),
      value,
      color: CAT_COLORS[k] ?? CAT_COLORS.other,
      emoji: CAT_EMOJI[k] ?? CAT_EMOJI.other,
    }
  })
}

// Backend /analytics/daily-activity returns an array of {date, count, totalPoints, types}.
// No per-user split exists upstream, so we surface combined activity under "Tú" and leave
// the partner bar empty until an endpoint provides split data.
function normalizeDaily(raw: unknown) {
  if (!Array.isArray(raw)) return []
  return raw.map((d: any) => {
    const dt = new Date(d.date)
    const label = isNaN(dt.getTime()) ? String(d.date ?? '') : DOW[dt.getDay()]
    return {
      label,
      you: Number(d.totalPoints ?? 0),
      partner: 0,
    }
  })
}

// Backend /points/chart-data returns { chartData: [{idx, date, [youName]: cumulative, [partnerName]?: cumulative}], youName, partnerName }.
// Return both cumulative series so we can plot two lines (user request B4).
function normalizeDailyBalance(raw: unknown) {
  if (!raw || typeof raw !== 'object') return []
  const r = raw as { chartData?: any[]; youName?: string; partnerName?: string | null }
  if (!Array.isArray(r.chartData)) return []
  const youKey = r.youName ?? 'Tú'
  const partnerKey = r.partnerName ?? ''
  return r.chartData.map((d: any) => ({
    label: String(d.date ?? ''),
    you: Number(d[youKey] ?? 0),
    partner: partnerKey ? Number(d[partnerKey] ?? 0) : 0,
  }))
}

export function BasicAnalytics() {
  const couple = useAppStore(s => s.couple)
  const user   = useAppStore(s => s.user)
  const users  = (couple as any)?.users ?? []
  const youName     = user?.name ?? 'Tú'
  const partnerName = users.find((u: any) => u.id !== user?.id)?.name ?? 'Pareja'

  const { data: daily }  = useQuery({ queryKey: ['a-daily'],  queryFn: () => fetchAnalytics('/analytics/daily-activity') })
  const { data: cats }   = useQuery({ queryKey: ['a-cats'],   queryFn: () => fetchAnalytics('/analytics/points-by-category') })
  // /points/chart-data?days=30 returns daily cumulative balance — the 30-day evolution chart
  // that used to live in Analítica Básica. It's not behind the /analytics prefix (no .data wrap).
  const { data: balance30 } = useQuery({
    queryKey: ['p-chart', 30],
    queryFn: () => apiClient.request('/points/chart-data?days=30'),
  })
  const { data: time }   = useQuery({ queryKey: ['a-time'],   queryFn: () => fetchAnalytics('/analytics/time-invested?range=week') })

  const catList  = normalizeCats(cats)
  const dayList  = normalizeDaily(daily)
  const balancePoints = normalizeDailyBalance(balance30)

  return (
    <>
      <WeeklyBarsChart days={dayList} youName={youName} partnerName={partnerName} />
      <CategoryPieChart categories={catList} />
      <BalanceEvolutionChart points={balancePoints} youName={youName} partnerName={partnerName} subtitle="Puntos acumulados · últimos 30 días" trendUnit="30 días" />
      <TimeInvestedChart you={time?.you ?? { name: youName, hours: 0 }} partner={time?.partner ?? { name: partnerName, hours: 0 }} />
    </>
  )
}
