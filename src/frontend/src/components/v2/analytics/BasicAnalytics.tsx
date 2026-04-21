import { useQuery } from '@tanstack/react-query'
import { WeeklyBarsChart } from './charts/WeeklyBarsChart'
import { CategoryPieChart } from './charts/CategoryPieChart'
import { BalanceEvolutionChart } from './charts/BalanceEvolutionChart'
import { TimeInvestedChart } from './charts/TimeInvestedChart'
import { fetchAnalytics } from './analyticsUtils'
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

function normalizeCats(raw: unknown) {
  if (!raw || typeof raw !== 'object') return []
  const entries = Object.entries(raw as Record<string, number>)
    .filter(([, v]) => typeof v === 'number' && v > 0)
  return entries.map(([key, value]) => ({
    name: CAT_LABEL[key] ?? key,
    value,
    color: CAT_COLORS[key] ?? CAT_COLORS.other,
    emoji: CAT_EMOJI[key] ?? CAT_EMOJI.other,
  }))
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

// Backend /analytics/weekly-trends returns [{label, events, points}].
// BalanceEvolutionChart expects [{label, balance}]; we use points as a proxy for net activity.
function normalizeWeekly(raw: unknown) {
  if (!Array.isArray(raw)) return []
  return raw.map((w: any) => ({
    label: String(w.label ?? ''),
    balance: Number(w.points ?? 0),
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
  const { data: trends } = useQuery({ queryKey: ['a-trends'], queryFn: () => fetchAnalytics('/analytics/weekly-trends?weeks=4') })
  const { data: time }   = useQuery({ queryKey: ['a-time'],   queryFn: () => fetchAnalytics('/analytics/time-invested?range=week') })

  const catList  = normalizeCats(cats)
  const dayList  = normalizeDaily(daily)
  const weekList = normalizeWeekly(trends)

  return (
    <>
      <WeeklyBarsChart days={dayList} youName={youName} partnerName={partnerName} />
      <CategoryPieChart categories={catList} />
      <BalanceEvolutionChart weeks={weekList} />
      <TimeInvestedChart you={time?.you ?? { name: youName, hours: 0 }} partner={time?.partner ?? { name: partnerName, hours: 0 }} />
    </>
  )
}
