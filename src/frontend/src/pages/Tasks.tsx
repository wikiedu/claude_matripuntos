// Tasks page — v2 design (Task 6.1 of v1.4 La Evolución).
// ViewToggle Lista | Semana, CategoryFilterStrip, three sections (Hoy / Esta semana / Catálogo),
// AddTaskSheet for task creation, dark-mode Log/Dispute modals.
// Rendered naked inside AuthedLayout (AppHeader is provided globally).

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus, CheckCircle, Loader, X, RefreshCw, AlertTriangle, CheckCheck, HelpCircle, Clock,
  Sparkles, History, ListChecks,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { toLocalDateString, formatLocalDate, formatLocalWeekDay } from '../utils/dateUtils'
import { WeeklyTaskView } from '../components/WeeklyTaskView'
import { WeekStrip } from '../components/v2/tasks/WeekStrip'
// v2.3.0 — Pill retirado del header tras refactor canvas 15.
import { Button } from '../components/v2/primitives/Button'
import {
  CategoryFilterStrip,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
} from '../components/v2/tasks/CategoryFilterStrip'
import { TaskItemLarge } from '../components/v2/tasks/TaskItemLarge'
import { TaskItemMedium } from '../components/v2/tasks/TaskItemMedium'
import { TaskCatalogRow } from '../components/v2/tasks/TaskCatalogRow'
import { AddTaskSheet } from '../components/v2/tasks/AddTaskSheet'
import { AddTaskFromCatalogSheet } from '../components/v2/tasks/AddTaskFromCatalogSheet'
import { usePointsBurst } from '../components/v2/dashboard/PointsBurst'
import { MPTabs } from '../components/v2/tasks/MPTabs'
import { HeaderStrip, type FilterValue } from '../components/v2/tasks/HeaderStrip'
import { VerifyBanner } from '../components/v2/tasks/VerifyBanner'
import { AllDoneCard } from '../components/v2/tasks/AllDoneCard'
// Pill ya no se usa tras v2.3.0 — quitamos import.
import { RecurringTaskManager } from '../components/v2/tasks/RecurringTaskManager'
import { ConfirmDialog } from '../components/v2/primitives/ConfirmDialog'
import { TaskProofUploader } from '../components/v2/proof/TaskProofUploader'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Task {
  id: string
  name: string
  category: string
  pointsBase: string
  description?: string
  isRecurring?: boolean
  frequency?: string | null
  scheduledFor?: string
  // v1.6.3 fix QA Bug 4: marcador de "tarea sembrada del catálogo del seed".
  // Si true y sin scheduledFor/recurrencia, no aparece en "Hoy".
  isDefault?: boolean
}

interface TaskLog {
  id: string
  taskId: string
  taskName: string
  taskCategory: string
  date: string
  pointsFinal: number | string
  status: 'pending' | 'verified' | 'disputed'
  modifier?: string
  completedBy: { id: string; name: string } | null
  verifiedBy: { id: string; name: string } | null
  verifiedAt?: string
  disputeReason?: string
}

// ─── Catalog data (copied from v1 Tasks.tsx lines 51-93) ──────────────────────
const TASK_CATALOG: { category: string; tasks: { name: string; pts: number; desc?: string }[] }[] = [
  { category: 'cocina', tasks: [
    { name: 'Cocinar la cena', pts: 12 }, { name: 'Cocinar la comida', pts: 10 },
    { name: 'Preparar el desayuno', pts: 6 }, { name: 'Fregar los platos', pts: 8 },
    { name: 'Vaciar el lavavajillas', pts: 5 }, { name: 'Limpiar la cocina', pts: 12 },
  ]},
  { category: 'limpieza', tasks: [
    { name: 'Pasar la aspiradora', pts: 10 }, { name: 'Fregar el suelo', pts: 12 },
    { name: 'Limpiar el polvo', pts: 8 }, { name: 'Poner la lavadora', pts: 6 },
    { name: 'Tender la ropa', pts: 6 }, { name: 'Doblar y guardar ropa', pts: 8 }, { name: 'Planchar', pts: 10 },
  ]},
  { category: 'baños', tasks: [
    { name: 'Limpiar baño completo', pts: 15 }, { name: 'Limpiar WC', pts: 8 },
    { name: 'Limpiar lavabos y espejos', pts: 7 },
  ]},
  { category: 'compra', tasks: [
    { name: 'Hacer la compra semanal', pts: 18, desc: 'Supermercado grande' },
    { name: 'Compra pequeña / reposición', pts: 8 }, { name: 'Hacer lista de la compra', pts: 5 },
    { name: 'Recibir pedido online', pts: 5 },
  ]},
  { category: 'logistica', tasks: [
    { name: 'Gestión facturas / banca', pts: 10 }, { name: 'Llamadas y gestiones admin', pts: 8 },
    { name: 'Organizar armarios', pts: 12 }, { name: 'Sacar basura / reciclaje', pts: 5 },
    { name: 'Llevar coche al taller', pts: 10 },
  ]},
  { category: 'cuidado', tasks: [
    { name: 'Llevar/recoger niños al cole', pts: 8 }, { name: 'Ayudar con los deberes', pts: 10 },
    { name: 'Baño / ducha de los niños', pts: 8 }, { name: 'Acostar a los niños', pts: 7 },
    { name: 'Tarde con los niños (actividades)', pts: 15 },
  ]},
  { category: 'mantenimiento', tasks: [
    { name: 'Reparación en casa', pts: 18, desc: 'Bricolaje, fontanería...' },
    { name: 'Gestionar reparación externa', pts: 10 }, { name: 'Organizar trastero/garaje', pts: 14 },
  ]},
  { category: 'jardineria', tasks: [
    { name: 'Regar las plantas', pts: 5 }, { name: 'Cortar el césped', pts: 15 },
    { name: 'Limpiar terraza / balcón', pts: 10 },
  ]},
  { category: 'mascotas', tasks: [
    { name: 'Sacar a pasear al perro', pts: 5 }, { name: 'Dar de comer a la mascota', pts: 4 },
    { name: 'Limpiar zona de la mascota', pts: 8 }, { name: 'Llevar al veterinario', pts: 12 },
  ]},
]

// ─── Log task modal ───────────────────────────────────────────────────────────
function LogTaskModal({ task, onClose, onSuccess }: {
  task: Task; onClose: () => void; onSuccess: (points?: number) => void
}) {
  const [modifier, setModifier] = useState<'none' | 'extra' | 'partial'>('none')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const base = parseFloat(task.pointsBase) || 10
  const modMap = { none: 1.0, extra: 1.3, partial: 0.7 }
  const finalPts = Math.round(base * modMap[modifier])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await apiClient.tasks.logCompletion(task.id, {
        date: new Date().toISOString(),
        pointsBase: base,
        modifier: modifier !== 'none' ? modifier : undefined,
      })
      onSuccess(finalPts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-surface-card border border-brd-purple rounded-xl shadow-xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-text-primary">Registrar tarea</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-muted rounded-full text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-surface-muted border border-brd-subtle rounded-md p-3 mb-4 flex items-center gap-3">
          <span className="text-2xl">{CATEGORY_EMOJI[task.category?.toLowerCase()] || '✅'}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary truncate">{task.name}</div>
            <div className="text-xs text-text-secondary">
              {CATEGORY_LABEL[task.category?.toLowerCase()] || task.category}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-brand-amber tabular-nums">{finalPts}</div>
            <div className="text-xs text-text-tertiary">pts</div>
          </div>
        </div>

        <div className="mb-4 p-3 bg-brand-purple/10 border border-brand-purple/30 rounded-md text-xs text-brand-purple">
          ℹ️ Los puntos se acreditarán cuando tu pareja <strong>verifique</strong> la tarea.
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-md text-danger text-sm">
            {error}
          </div>
        )}

        <div className="mb-5 space-y-2">
          <p className="text-xs font-semibold text-text-secondary mb-1">¿Cómo fue?</p>
          {([
            { value: 'none' as const, label: '✔️ Normal', desc: `${base} pts` },
            { value: 'extra' as const, label: '⭐ Esfuerzo extra', desc: `+30% → ${Math.round(base * 1.3)} pts` },
            { value: 'partial' as const, label: '🔸 Parcial', desc: `−30% → ${Math.round(base * 0.7)} pts` },
          ]).map((opt) => {
            const active = modifier === opt.value
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition ${
                  active
                    ? 'border-brand-purple/40 bg-brand-purple/10'
                    : 'border-brd-subtle bg-surface-card'
                }`}
              >
                <input
                  type="radio"
                  name="modifier"
                  checked={active}
                  onChange={() => setModifier(opt.value)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{opt.label}</div>
                  <div className="text-xs text-text-secondary">{opt.desc}</div>
                </div>
                {active && <div className="w-2.5 h-2.5 rounded-full bg-brand-purple flex-shrink-0" />}
              </label>
            )
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} fullWidth disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} fullWidth disabled={isSubmitting}>
            <span className="inline-flex items-center gap-2">
              {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Registrar (+{finalPts} pts)
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Dispute modal ────────────────────────────────────────────────────────────
function DisputeModal({ log, onClose, onSuccess }: {
  log: TaskLog; onClose: () => void; onSuccess: () => void
}) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await apiClient.tasks.disputeLog(log.taskId, log.id, { disputeReason: reason.trim() || 'Sin motivo' })
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al disputar')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-surface-card border border-brd-purple rounded-xl shadow-xl max-w-sm w-full p-5">
        <h3 className="text-base font-bold text-text-primary mb-1">⚠️ Disputar tarea</h3>
        <p className="text-sm text-text-secondary mb-4">
          Disputando <strong className="text-text-primary">{log.taskName}</strong> de{' '}
          <strong className="text-text-primary">{log.completedBy?.name}</strong> ({log.pointsFinal} pts)
        </p>
        {error && (
          <div className="mb-3 p-3 bg-danger/10 border border-danger/30 rounded-md text-danger text-sm">
            {error}
          </div>
        )}
        <label className="text-xs font-semibold text-text-secondary mb-1 block">Motivo (opcional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="¿Por qué cuestionas esta tarea?"
          rows={3}
          className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 mb-4"
        />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} fullWidth disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleSubmit} fullWidth disabled={isSubmitting}>
            <span className="inline-flex items-center gap-1">
              {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Disputar
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Segment control (reusable) ───────────────────────────────────────────────
function Segment<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; badge?: number }[]
}) {
  return (
    <div className="inline-flex gap-1 p-1 rounded-lg bg-surface-card border border-brd-subtle">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              active
                ? 'bg-grad-cta text-white shadow-md shadow-brand-amber/30'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt.label}
            {opt.badge !== undefined && opt.badge > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-danger/80 text-white'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Tasks() {
  const queryClient = useQueryClient()
  const { user } = useAppStore()

  const [tasks, setTasks] = useState<Task[]>([])
  const [allLogs, setAllLogs] = useState<TaskLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<'mis_tareas' | 'recurrentes' | 'verificar' | 'historial'>('mis_tareas')

  // Modals
  const [loggingTask, setLoggingTask] = useState<Task | null>(null)
  const [disputingLog, setDisputingLog] = useState<TaskLog | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  // v2.1.1: el botón primario abre el sheet del catálogo. El secundario abre
  // el AddTaskSheet en blanco (crear tarea nueva fuera del catálogo).
  const [showCatalogSheet, setShowCatalogSheet] = useState(false)
  const [addingFromCatalog, setAddingFromCatalog] = useState<string | null>(null)
  const [showCatalog, setShowCatalog] = useState(false)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)

  // View state
  const [view, setView] = useState<'list' | 'week'>(() => {
    try { return (localStorage.getItem('mp.tasks.view') as any) || 'list' } catch { return 'list' }
  })
  const setViewPersisted = (v: 'list' | 'week') => {
    setView(v)
    try { localStorage.setItem('mp.tasks.view', v) } catch { /* ignore */ }
  }
  // v2.3.0 — segment único Mías/Todas/Recurrentes (Claude Design canvas 15).
  // Mapea a `tab` legacy: mine→mis_tareas, all→mis_tareas con personFilter='all',
  // recurring→recurrentes.
  const [filter, setFilter] = useState<FilterValue>(() => {
    try { return (localStorage.getItem('mp.tasks.filter') as FilterValue) || 'mine' } catch { return 'mine' }
  })
  const setFilterPersisted = (f: FilterValue) => {
    setFilter(f)
    try { localStorage.setItem('mp.tasks.filter', f) } catch {}
    if (f === 'recurring') setTab('recurrentes')
    else setTab('mis_tareas')
    setPersonFilter(f === 'all' ? 'all' : 'mine')
  }
  const [cat, setCat] = useState<string>('all')
  const [personFilter, setPersonFilter] = useState<'all' | 'mine' | 'partner'>('all')
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    d.setHours(0, 0, 0, 0)
    return d
  })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    // v2.2.12 — Render hace cold-start tras inactividad; el primer request
    // a veces falla con "Failed to fetch". Reintentamos 2 veces con backoff
    // antes de mostrar error al usuario.
    const attempt = async () => {
      const [tasksRes, logsRes] = await Promise.all([
        apiClient.tasks.getAll(),
        apiClient.tasks.getAllLogs(),
      ])
      setTasks((tasksRes as any).tasks || [])
      setAllLogs(((logsRes as any).logs || []).map((l: any) => ({
        ...l,
        taskName: l.taskName ?? l.task?.name ?? '',
        taskCategory: l.taskCategory ?? l.task?.category ?? '',
      })))
    }
    let lastErr: unknown = null
    for (let i = 0; i < 3; i++) {
      try {
        await attempt()
        lastErr = null
        break
      } catch (e) {
        lastErr = e
        const isNetwork = e instanceof TypeError || (e instanceof Error && /failed to fetch/i.test(e.message))
        if (!isNetwork) break
        await new Promise((r) => setTimeout(r, 600 * (i + 1)))
      }
    }
    if (lastErr) {
      setError(lastErr instanceof Error ? lastErr.message : 'Error cargando tareas')
    }
    setIsLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // v1.6.3 fix QA Bug 3: refetch automático al volver al tab/window. Antes el
  // user tenía que pulsar refresh manual cuando el partner verificaba/disputaba
  // una tarea. Ahora cualquier acción del partner se ve al volver a Matripuntos.
  useEffect(() => {
    function onFocus() { loadData() }
    function onVisible() { if (document.visibilityState === 'visible') loadData() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadData])

  // v1.6.3 fix QA Bug 3: polling cada 30s mientras la tab está visible —
  // captura cambios del partner sin necesidad de blur/focus.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') loadData()
    }, 30_000)
    return () => clearInterval(id)
  }, [loadData])

  // ─── Derived state ─────────────────────────────────────────────────────────
  const today = toLocalDateString(new Date())

  const myTodayLogs = allLogs.filter(
    (l) => l.completedBy?.id === user?.id && l.date?.toString().startsWith(today),
  )
  const myTodayLogsByTask = new Map(myTodayLogs.map((l) => [l.taskId, l]))

  const myPendingLogs = allLogs.filter(
    (l) => l.completedBy?.id === user?.id && l.status === 'pending',
  )
  const partnerPendingLogs = allLogs.filter(
    (l) => l.completedBy?.id !== user?.id && l.status === 'pending',
  )
  // Quick-win #4 2026-04-22: filtro mías/pareja aplicado al historial para
  // facilitar repasar rápidamente qué hizo cada uno.
  const matchesPerson = (l: TaskLog) =>
    personFilter === 'all'
      ? true
      : personFilter === 'mine'
        ? l.completedBy?.id === user?.id
        : l.completedBy?.id && l.completedBy.id !== user?.id
  const historyLogs = allLogs
    .filter((l) => l.status !== 'pending')
    .filter(matchesPerson)

  const filteredTasks = cat === 'all' ? tasks : tasks.filter((t) => t.category?.toLowerCase() === cat)

  // A task is "done for now" if anyone in the couple has a log for it
  // (pending or verified) dated today, or has a pending-verification log from
  // any recent day. Those logs already surface in the "pendientes de verificación"
  // widget above; re-listing them in Hoy confuses the user into thinking they
  // need to redo the task. Once partner verifies/disputes, the task reappears.
  const taskIdsHiddenFromToday = new Set<string>()
  for (const l of allLogs) {
    if (l.date?.toString().startsWith(today)) taskIdsHiddenFromToday.add(l.taskId)
    if (l.status === 'pending') taskIdsHiddenFromToday.add(l.taskId)
  }
  // Bug 2026-04-22: "Hoy" used to require scheduledFor<=today, which meant
  // catalog-added tasks and puntual custom tasks (both have scheduledFor=null)
  // were invisible everywhere. Now "Hoy" shows (a) scheduled tasks due
  // today-or-earlier AND (b) unscheduled tasks the user has in their list —
  // those are "available whenever" and belong here until the user acts on them.
  //
  // Bug 2026-04-23: una recurrente pausada (frequency!=null, isRecurring=false)
  // seguía apareciendo hoy porque scheduledFor quedaba apuntando a la última
  // instancia generada. Pause borra las ocurrencias futuras pero no reescribe
  // scheduledFor del Task row, así que filtramos explícitamente aquí.
  const todayTasks = filteredTasks
    .filter((t) => !taskIdsHiddenFromToday.has(t.id))
    .filter((t) => !(t.frequency && !t.isRecurring))
    // v1.6.3 fix QA Bug 4: las tasks con isDefault=true son sugerencias del
    // seed del couple, no tareas activas. Solo deben aparecer en "Hoy" si
    // tienen scheduledFor o son recurrentes (es decir, el user las activó
    // explícitamente). Antes contaminaban el listado de cada día con todo
    // el catálogo.
    .filter((t) => !t.isDefault || !!t.scheduledFor || t.isRecurring)
    // v2.0.6 fix bug "tareas que aparecen solas": antes una tarea sin
    // `scheduledFor` aparecía en "Hoy" para siempre, todos los días, en ambas
    // cuentas de la pareja. Ahora "Hoy" sólo muestra tareas con scheduledFor
    // hoy o en el pasado (vencidas). Las no programadas viven en el catálogo y
    // solo entran a "Hoy" cuando el usuario las programa.
    .filter((t) => {
      if (!t.scheduledFor) return false
      const sf = toLocalDateString(t.scheduledFor)
      return sf <= today
    })

  // Week bounds (in local time) — used for the "Esta semana" section
  const weekBounds = (() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const day = start.getDay()
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return { start, end }
  })()

  const weekNotTodayTasks = filteredTasks.filter((t) => {
    if (!t.scheduledFor) return false
    // v1.6.3 fix QA Bug 4: misma lógica que en todayTasks — descartar
    // sugerencias inactivas del catálogo.
    if (t.isDefault && !t.scheduledFor && !t.isRecurring) return false
    const d = new Date(t.scheduledFor)
    if (isNaN(d.getTime())) return false
    if (d >= weekBounds.start && d < weekBounds.end) {
      return toLocalDateString(d) !== today
    }
    return false
  })

  // Bug 2026-04-22: el catálogo es un listado fijo de ideas — no se filtra por
  // lo que ya añadiste. Duplicar es intencional (ej: "Limpiar baño" con dos
  // baños). Antes escondíamos ítems ya añadidos, lo que hacía que el catálogo
  // pareciera que "desaparecía" al usarlo.
  const visibleCatalog = TASK_CATALOG
    .filter((g) => cat === 'all' || g.category === cat)

  // v2.2.0 — microinteracción +X MP al completar (canvas 13 Claude Design)
  const burst = usePointsBurst()

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleLogSuccess = async (loggedPoints?: number) => {
    if (loggedPoints && loggedPoints > 0) {
      // Anchor: el botón que el user pulsó. Si no lo tenemos, centrado.
      burst.trigger(`+${loggedPoints} MP`, document.activeElement)
    }
    setLoggingTask(null)
    setSuccess('✅ Tarea registrada. Tu pareja recibirá una notificación para verificarla.')
    setTimeout(() => setSuccess(null), 5000)
    queryClient.invalidateQueries({ queryKey: ['gamification', 'status'] })
    queryClient.invalidateQueries({ queryKey: ['achievements', 'map'] })
    await loadData()
  }

  const handleVerify = async (log: TaskLog) => {
    setVerifyingId(log.id)
    setError(null)
    try {
      await apiClient.tasks.verifyLog(log.taskId, log.id)
      setSuccess(`✅ Verificado. +${log.pointsFinal} pts para ${log.completedBy?.name}`)
      setTimeout(() => setSuccess(null), 5000)
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['achievements', 'map'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] })
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al verificar')
    } finally {
      setVerifyingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingTask) return
    setDeleting(true)
    try {
      await apiClient.tasks.delete(deletingTask.id)
      setSuccess(`🗑️ "${deletingTask.name}" eliminada`)
      setTimeout(() => setSuccess(null), 3000)
      setDeletingTask(null)
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al borrar tarea')
    } finally {
      setDeleting(false)
    }
  }

  const handleDisputeSuccess = async () => {
    setDisputingLog(null)
    setSuccess('⚠️ Tarea disputada. Se notificará a tu pareja.')
    setTimeout(() => setSuccess(null), 4000)
    await loadData()
  }

  const handleCreateFromCatalog = async (name: string, category: string, pts: number, desc?: string) => {
    setAddingFromCatalog(name)
    try {
      await apiClient.tasks.create({ name: name.trim(), category, pointsBase: pts, description: desc?.trim() })
      setSuccess('✅ Tarea añadida a tu lista')
      setTimeout(() => setSuccess(null), 3000)
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creando tarea')
    } finally {
      setAddingFromCatalog(null)
    }
  }

  const handleAddSheetSaved = async () => {
    setSuccess('✅ Tarea creada')
    setTimeout(() => setSuccess(null), 3000)
    await loadData()
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="pt-1 pb-6">
      {/* v2.2.0 — portal de microinteracción +X MP (canvas 13 Claude Design) */}
      {burst.node}

      {/* Modals */}
      {loggingTask && (
        <LogTaskModal task={loggingTask} onClose={() => setLoggingTask(null)} onSuccess={handleLogSuccess} />
      )}
      {disputingLog && (
        <DisputeModal log={disputingLog} onClose={() => setDisputingLog(null)} onSuccess={handleDisputeSuccess} />
      )}
      <AddTaskSheet
        open={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSaved={handleAddSheetSaved}
      />
      <AddTaskFromCatalogSheet
        open={showCatalogSheet}
        catalog={TASK_CATALOG}
        existingTasks={tasks.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category ?? '',
          pointsBase: String(t.pointsBase ?? 0),
          isDefault: !!(t as any).isDefault,
        }))}
        partnerName={(useAppStore.getState().couple?.users ?? []).find(u => u.id !== user?.id)?.name ?? 'Tu pareja'}
        meName={user?.name ?? 'Yo'}
        onClose={() => setShowCatalogSheet(false)}
        onSaved={() => { setShowCatalogSheet(false); handleAddSheetSaved() }}
      />
      <ConfirmDialog
        open={deletingTask !== null}
        title="¿Borrar tarea?"
        message={
          deletingTask
            ? `"${deletingTask.name}" se eliminará junto con todos sus registros. Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Borrar"
        variant="danger"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !deleting && setDeletingTask(null)}
      />

      {/* v2.3.0 — Refactor canvas 15: top tabs +MP/-MP + pg-h + HeaderStrip
          único + VerifyBanner condicional. Sustituye 4 niveles de UI por 2. */}
      <MPTabs active="tasks" />
      <div className="px-4 pt-2.5 pb-1.5 flex items-center justify-between">
        <h1 className="m-0 text-[22px] font-black tracking-tight text-text-primary">Tareas</h1>
        <button
          type="button"
          onClick={loadData}
          aria-label="Actualizar"
          className="text-[11px] font-bold text-text-tertiary bg-surface-card border border-brd-subtle rounded-full px-2.5 py-1 hover:text-text-primary inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
        >
          <RefreshCw className="w-3 h-3" /> Actualizar
        </button>
      </div>
      <HeaderStrip
        mode="tasks"
        filter={filter}
        onFilterChange={setFilterPersisted}
        view={view}
        onViewToggle={() => setViewPersisted(view === 'list' ? 'week' : 'list')}
        onAdd={() => setShowCatalogSheet(true)}
      />

      {/* v2.3.0 — banner condicional de verificación. Sustituye la inner tab
          'Verificar' que estaba vacía 80% del tiempo. Si no hay nada, 0px. */}
      <VerifyBanner
        pendingLogs={partnerPendingLogs.map((l) => ({
          id: l.id,
          taskId: l.taskId,
          taskName: l.taskName ?? '',
          pointsFinal: l.pointsFinal,
          completedBy: l.completedBy,
        }))}
        onVerify={(log) => handleVerify(log as any)}
      />

      {/* Wrapper px-4 para el contenido legacy (lista/semana) */}
      <div className="px-4">

      {/* Inline banners */}
      {error && (
        <div className="mb-3 p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm flex items-start justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-3 p-3 rounded-md bg-success/15 border border-success/30 text-success text-sm">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-text-secondary">
          <Loader className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando tareas…</span>
        </div>
      ) : view === 'week' ? (
        // ── SEMANA VIEW (canvas 15 S03) ──
        <div className="-mx-4">{/* anular el wrapper px-4 para que WeekStrip ocupe todo el ancho */}
          <div className="flex items-center justify-between px-6 py-2 mb-2">
            <button
              onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }}
              className="text-text-secondary hover:text-text-primary px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
              aria-label="Semana anterior"
            >
              ‹
            </button>
            <span className="text-xs font-bold text-text-secondary">
              {weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} –{' '}
              {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString('es-ES', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
            <button
              onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }}
              className="text-text-secondary hover:text-text-primary px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
              aria-label="Semana siguiente"
            >
              ›
            </button>
          </div>

          {/* v2.3.3 — WeekStrip 7 días (canvas 15) */}
          {(() => {
            const todayIso = new Date().toISOString().slice(0, 10)
            const dayLetters = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(weekStart)
              d.setDate(d.getDate() + i)
              const iso = d.toISOString().slice(0, 10)
              const tasksOnDay = filteredTasks.filter((t) => {
                if (!t.scheduledFor) return false
                return new Date(t.scheduledFor).toISOString().slice(0, 10) === iso
              })
              const pip: 'amber' | 'spend' | 'both' | null =
                tasksOnDay.length > 0 ? 'amber' : null
              return {
                dn: dayLetters[i],
                dd: d.getDate(),
                iso,
                today: iso === todayIso,
                pip,
              }
            })
            return <WeekStrip days={days} />
          })()}

          <div className="px-4">
            <WeeklyTaskView weekStart={weekStart} />
          </div>
        </div>
      ) : (
        // ── LISTA VIEW ──
        <>
          {/* ── MIS TAREAS TAB ── */}
          {tab === 'mis_tareas' && (
            <div className="space-y-4">
              <CategoryFilterStrip value={cat} onChange={setCat} />

              {myPendingLogs.length > 0 && (
                <div className="p-3 rounded-md bg-warn/10 border border-warn/30">
                  <p className="text-sm font-semibold text-warn mb-2 inline-flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Mis tareas pendientes de verificación ({myPendingLogs.length})
                  </p>
                  <div className="space-y-1.5">
                    {myPendingLogs.map((log) => (
                      <div key={log.id} className="bg-surface-card rounded-md px-3 py-2 border border-brd-subtle">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{CATEGORY_EMOJI[log.taskCategory?.toLowerCase()] || '✅'}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">{log.taskName}</p>
                              <p className="text-xs text-text-tertiary">{formatLocalDate(log.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-sm font-bold text-warn tabular-nums">+{log.pointsFinal} pts</span>
                          </div>
                        </div>
                        <TaskProofUploader logId={log.id} canEdit={true} compact />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Hoy — header refinado canvas 15 (con day stamp + count amber) */}
              {(() => {
                const dayLabel = new Date().toLocaleDateString('es-ES', {
                  weekday: 'short', day: 'numeric', month: 'short',
                }).replace('.', '')
                const allDoneToday = todayTasks.length > 0 && myTodayLogs.length >= todayTasks.length
                const totalMpToday = myTodayLogs.reduce((s, l) => s + Number(l.pointsFinal || 0), 0)
                const pendingThisWeek = weekNotTodayTasks.length
                return (
                  <section>
                    <div className="flex items-baseline justify-between px-1 pt-3.5 pb-2">
                      <h3 className="m-0 text-[13px] font-extrabold text-text-primary tracking-tight">
                        🔥 Hoy
                        <span className="ml-2 text-xs font-semibold text-text-tertiary">· {dayLabel}</span>
                      </h3>
                      <span className="text-[11px] font-bold text-text-tertiary tabular-nums tracking-wide">
                        <b className="text-brand-amber font-extrabold">{myTodayLogs.length}</b>/{todayTasks.length}
                      </span>
                    </div>
                    {allDoneToday && (
                      <AllDoneCard totalMpToday={totalMpToday} pendingThisWeek={pendingThisWeek} />
                    )}
                  </section>
                )
              })()}

              {/* Section: Hoy (contenido original mantenido) */}
              <section>
                {todayTasks.length === 0 ? (
                  <div className="rounded-md bg-surface-card border border-brd-subtle p-6 text-center">
                    {filteredTasks.length === 0 ? (
                      <ListChecks className="w-9 h-9 mx-auto text-text-tertiary mb-2" />
                    ) : (
                      <Sparkles className="w-9 h-9 mx-auto text-brand-purple mb-2" />
                    )}
                    <p className="text-sm font-semibold text-text-primary mb-1">
                      {filteredTasks.length === 0
                        ? (cat === 'all' ? 'Sin tareas en tu lista' : 'Sin tareas en esta categoría')
                        : 'Todo al día'}
                    </p>
                    <p className="text-xs text-text-secondary mb-3 max-w-xs mx-auto">
                      {filteredTasks.length === 0
                        ? (cat === 'all'
                          ? 'Empieza añadiendo una tarea del catálogo o crea la tuya — se repartirán los puntos según quien la haga.'
                          : 'Revisa el catálogo más abajo o crea una tarea en esta categoría.')
                        : 'Las tareas de hoy están completadas o esperando a que tu pareja las verifique.'}
                    </p>
                    {filteredTasks.length === 0 && cat === 'all' && (
                      <Button size="sm" onClick={() => setShowCatalogSheet(true)}>
                        <span className="inline-flex items-center gap-1">
                          <Plus className="w-4 h-4" /> Añadir del catálogo
                        </span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayTasks.map((task) => {
                      const myLog = myTodayLogsByTask.get(task.id)
                      const doneToday = !!myLog
                      return (
                        <div key={task.id} className="relative group">
                          <TaskItemLarge
                            task={{
                              id: task.id,
                              name: task.name,
                              category: task.category,
                              pointsBase: task.pointsBase,
                              isRecurring: (task as any).isRecurring,
                              scheduledFor: (task as any).scheduledFor,
                            }}
                            doneToday={doneToday}
                            status={myLog?.status}
                            onMark={() => !doneToday && setLoggingTask(task)}
                          />
                          <button
                            type="button"
                            onClick={() => setDeletingTask(task)}
                            aria-label={`Borrar ${task.name}`}
                            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-surface-card border border-brd-subtle text-text-tertiary hover:text-danger hover:border-danger/40 text-xs flex items-center justify-center shadow-sm"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Section: Esta semana — header refinado canvas 15 */}
              {weekNotTodayTasks.length > 0 && (
                <section>
                  <div className="flex items-baseline justify-between px-1 pt-3.5 pb-2">
                    <h3 className="m-0 text-[13px] font-extrabold text-text-primary tracking-tight">📅 Esta semana</h3>
                    <span className="text-[11px] font-bold text-text-tertiary tabular-nums tracking-wide">
                      <b className="text-brand-amber font-extrabold">0</b>/{weekNotTodayTasks.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {weekNotTodayTasks.map((task) => (
                      <div key={task.id} className="relative group">
                        <TaskItemMedium
                          task={{
                            id: task.id,
                            name: task.name,
                            category: task.category,
                            pointsBase: task.pointsBase,
                            isRecurring: (task as any).isRecurring,
                            scheduledFor: (task as any).scheduledFor,
                          }}
                          doneToday={false}
                          onMark={() => setLoggingTask(task)}
                        />
                        <button
                          type="button"
                          onClick={() => setDeletingTask(task)}
                          aria-label={`Borrar ${task.name}`}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-surface-card border border-brd-subtle text-text-tertiary hover:text-danger hover:border-danger/40 text-xs flex items-center justify-center shadow-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Section: Catálogo (collapsed by default) */}
              {visibleCatalog.length > 0 && (
                <section>
                  <button
                    type="button"
                    onClick={() => setShowCatalog((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-surface-card border border-brd-subtle text-sm font-semibold text-text-primary hover:bg-surface-muted transition-colors"
                  >
                    <span>
                      📚 {showCatalog ? 'Ocultar catálogo' : 'Ver catálogo'}
                      <span className="ml-1.5 text-xs font-normal text-text-tertiary">
                        ({visibleCatalog.reduce((s, g) => s + g.tasks.length, 0)} ideas)
                      </span>
                    </span>
                    <span className="text-text-tertiary text-xs">{showCatalog ? '▲' : '▼'}</span>
                  </button>
                  {showCatalog && (
                    <div className="mt-2 rounded-md bg-surface-card border border-brd-subtle overflow-hidden">
                      {visibleCatalog.map((group) => (
                        <div key={group.category}>
                          <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-text-tertiary bg-surface-muted border-b border-brd-subtle">
                            {CATEGORY_EMOJI[group.category]} {CATEGORY_LABEL[group.category]}
                          </div>
                          {group.tasks.map((t) => (
                            <TaskCatalogRow
                              key={`${group.category}-${t.name}`}
                              name={t.name}
                              pts={t.pts}
                              desc={t.desc}
                              busy={addingFromCatalog === t.name}
                              onAdd={() => handleCreateFromCatalog(t.name, group.category, t.pts, t.desc)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {/* ── RECURRENTES TAB ── */}
          {tab === 'recurrentes' && (
            <RecurringTaskManager onChanged={loadData} />
          )}

          {/* ── VERIFICAR TAB ── */}
          {tab === 'verificar' && (
            <div className="space-y-4">
              {partnerPendingLogs.length > 0 ? (
                <>
                  <p className="text-sm text-text-secondary">
                    Tu pareja ha completado {partnerPendingLogs.length} tarea
                    {partnerPendingLogs.length !== 1 ? 's' : ''} que esperan tu verificación
                  </p>
                  {partnerPendingLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-surface-card border border-brd-subtle border-l-4 border-l-brand-purple"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {CATEGORY_EMOJI[log.taskCategory?.toLowerCase()] || '✅'}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-text-primary truncate">{log.taskName}</p>
                              <p className="text-xs text-text-secondary">
                                {log.completedBy?.name} · {formatLocalWeekDay(log.date)}
                                {log.modifier && log.modifier !== 'none' && (
                                  <span
                                    className={`ml-2 text-[11px] px-1.5 py-0.5 rounded-full ${
                                      log.modifier === 'extra'
                                        ? 'bg-success/15 text-success border border-success/30'
                                        : 'bg-warn/15 text-warn border border-warn/30'
                                    }`}
                                  >
                                    {log.modifier === 'extra' ? '⭐ Extra +30%' : '🔸 Parcial −30%'}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <div className="text-xl font-bold text-brand-purple tabular-nums">+{log.pointsFinal}</div>
                          <div className="text-[11px] text-text-tertiary">pts</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify(log)}
                          disabled={verifyingId === log.id}
                          className="flex-1 py-2 px-3 rounded-md text-sm font-bold bg-success/15 text-success border border-success/30 hover:bg-success/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition"
                        >
                          {verifyingId === log.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCheck className="w-4 h-4" />
                          )}
                          Verificar (+{log.pointsFinal} pts)
                        </button>
                        <button
                          onClick={() => setDisputingLog(log)}
                          disabled={verifyingId === log.id}
                          className="flex-1 py-2 px-3 rounded-md text-sm font-bold bg-warn/15 text-warn border border-warn/30 hover:bg-warn/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Disputar
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="rounded-md bg-surface-card border border-brd-subtle p-10 text-center">
                  <Sparkles className="w-10 h-10 mx-auto text-brand-purple mb-2" />
                  <p className="font-semibold text-text-primary">Todo al día</p>
                  <p className="text-sm text-text-secondary mt-1 max-w-xs mx-auto">
                    No hay tareas de tu pareja pendientes de verificar. Cuando complete una nueva tarea, aparecerá aquí para confirmarla.
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTab('mis_tareas')}
                    className="mt-3"
                  >
                    Ir a mis tareas
                  </Button>
                </div>
              )}

              {myPendingLogs.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Mis tareas esperando tu pareja ({myPendingLogs.length})
                  </h3>
                  <div className="space-y-1.5">
                    {myPendingLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-md bg-surface-card border border-brd-subtle opacity-70"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-text-primary">{log.taskName}</p>
                            <p className="text-[11px] text-text-tertiary">
                              {formatLocalDate(log.date)} · ⏳ Esperando verificación
                            </p>
                          </div>
                          <span className="text-sm font-bold text-text-tertiary tabular-nums">
                            +{log.pointsFinal} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* v2.3.1 — link historial al final (canvas 15). Visible siempre
                  que haya logs en allLogs (si la pareja ya tiene actividad). */}
              {allLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab('historial')}
                  className="block mx-auto mt-4 mb-2 text-xs font-bold text-text-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded px-2 py-1"
                >
                  Ver <span className="text-brand-purple">historial completo →</span>
                </button>
              )}
            </div>
          )}

          {/* ── HISTORIAL TAB ── */}
          {tab === 'historial' && (
            <div className="space-y-2">
              <div className="mb-1">
                <Segment<'all' | 'mine' | 'partner'>
                  value={personFilter}
                  onChange={setPersonFilter}
                  options={[
                    { value: 'all', label: 'Todas' },
                    { value: 'mine', label: 'Mías' },
                    { value: 'partner', label: 'Pareja' },
                  ]}
                />
              </div>
              {historyLogs.length === 0 ? (
                <div className="rounded-md bg-surface-card border border-brd-subtle p-10 text-center">
                  <History className="w-10 h-10 mx-auto text-text-tertiary mb-2" />
                  <p className="font-semibold text-text-primary">
                    {personFilter === 'mine'
                      ? 'Sin tareas tuyas todavía'
                      : personFilter === 'partner'
                        ? 'Sin tareas de tu pareja todavía'
                        : 'Sin historial todavía'}
                  </p>
                  <p className="text-sm text-text-secondary mt-1 max-w-xs mx-auto">
                    Las tareas verificadas y disputadas se archivan aquí para revisar puntos, disputas y quién hace qué con el tiempo.
                  </p>
                  {personFilter !== 'all' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPersonFilter('all')}
                      className="mt-3"
                    >
                      Ver todas
                    </Button>
                  )}
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-md bg-surface-card border border-brd-subtle">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                              log.status === 'verified'
                                ? 'bg-success/15 text-success border border-success/30'
                                : 'bg-warn/15 text-warn border border-warn/30'
                            }`}
                          >
                            {log.status === 'verified' ? '✅ Verificada' : '⚠️ Disputada'}
                          </span>
                        </div>
                        <p className="font-medium text-text-primary truncate">{log.taskName}</p>
                        <p className="text-[11px] text-text-tertiary">
                          {log.completedBy?.name} · {formatLocalDate(log.date)}
                          {log.verifiedBy && ` · ✓ ${log.verifiedBy.name}`}
                        </p>
                        {log.disputeReason && (
                          <p className="text-[11px] text-warn mt-0.5">💬 "{log.disputeReason}"</p>
                        )}
                      </div>
                      <div className="ml-3 text-right">
                        <div
                          className={`font-bold text-sm tabular-nums ${
                            log.status === 'verified' ? 'text-success' : 'text-text-tertiary'
                          }`}
                        >
                          {log.status === 'verified' ? `+${log.pointsFinal}` : log.pointsFinal} pts
                        </div>
                        <div className="text-[11px] text-text-tertiary">{log.completedBy?.name}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
      </div> {/* /v2.3.0 wrapper px-4 */}
    </main>
  )
}
