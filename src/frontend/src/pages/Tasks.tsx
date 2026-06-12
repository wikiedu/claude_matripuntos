// Tasks page — v2 design (Task 6.1 of v1.4 La Evolución).
// ViewToggle Lista | Semana, CategoryFilterStrip, three sections (Hoy / Esta semana / Catálogo),
// AddTaskSheet for task creation, dark-mode Log/Dispute modals.
// Rendered naked inside AuthedLayout (AppHeader is provided globally).

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isSheetOpen } from '../lib/sheetLock'
import {
  Plus, Loader, X, RefreshCw, Clock,
  Sparkles, History, ListChecks,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { toLocalDateString, formatLocalDate } from '../utils/dateUtils'
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
import { LogTaskModal } from '../components/v2/tasks/LogTaskModal'
import { DisputeModal } from '../components/v2/tasks/DisputeModal'
import { Segment } from '../components/v2/tasks/Segment'
import { TASK_CATALOG } from '../components/v2/tasks/taskCatalog'
import type { Task, TaskLog } from '../components/v2/tasks/taskTypes'

// ─── Main component ───────────────────────────────────────────────────────────
export default function Tasks() {
  const queryClient = useQueryClient()
  const { user } = useAppStore()

  // v2.5 audit 05 S0 + 07 — migración a React Query.
  // Antes: useState + useEffect propio + focus/visibilitychange/setInterval
  // → triple polling no coordinado que causaba el "refresh extraño". v2.3.5
  // mitigó la ruta de AuthedLayout pero esta página tenía SU propio polling.
  // Ahora: useQuery con refetchInterval que respeta sheetLock + visibility.
  const tasksQuery = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => apiClient.tasks.getAll() as Promise<{ tasks: Task[] }>,
    select: (d) => (d?.tasks ?? []),
    staleTime: 10_000,
    refetchInterval: () => (isSheetOpen() ? false : 30_000),
    refetchIntervalInBackground: false,
  })
  const logsQuery = useQuery({
    queryKey: ['tasks', 'logs', 'all'],
    queryFn: () => apiClient.tasks.getAllLogs() as Promise<{ logs: any[] }>,
    select: (d) =>
      (d?.logs ?? []).map((l: any) => ({
        ...l,
        taskName: l.taskName ?? l.task?.name ?? '',
        taskCategory: l.taskCategory ?? l.task?.category ?? '',
      })) as TaskLog[],
    staleTime: 10_000,
    refetchInterval: () => (isSheetOpen() ? false : 30_000),
    refetchIntervalInBackground: false,
  })
  const tasks: Task[] = tasksQuery.data ?? []
  const allLogs: TaskLog[] = logsQuery.data ?? []
  // isLoading sólo en bootstrap (sin data aún) para evitar el flash en
  // refetches background (mismo patrón que useAppStore.isRefreshing).
  const isLoading = (tasksQuery.isLoading && !tasksQuery.data) || (logsQuery.isLoading && !logsQuery.data)
  // `error` agrega errores de query Y errores de mutaciones (verify, log,
  // dispute, delete...). Las mutaciones lo setean vía `setError` y las
  // queries vía la unión de tasksQuery.error / logsQuery.error.
  const [mutationError, setMutationError] = useState<string | null>(null)
  const setError = setMutationError
  const error = mutationError ?? tasksQuery.error?.message ?? logsQuery.error?.message ?? null
  const [success, setSuccess] = useState<string | null>(null)
  // v2.5.7 audit 05 — eliminada la pestaña 'verificar' del tipo: era dead
  // code desde v2.3.0 (reemplazada por VerifyBanner condicional).
  const [tab, setTab] = useState<'mis_tareas' | 'recurrentes' | 'historial'>('mis_tareas')

  // Modals
  const [loggingTask, setLoggingTask] = useState<Task | null>(null)
  const [disputingLog, setDisputingLog] = useState<TaskLog | null>(null)
  // v2.5.7 — verifyingId quedó como state local sin lectores tras eliminar
  // pestaña 'verificar' (audit 05). Lo conservamos por si lo usa
  // VerifyBanner en el futuro; el setter sigue exportado.
  const [, setVerifyingId] = useState<string | null>(null)
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

  // v2.5 audit 05 S0 — el polling y los listeners de focus/visibility
  // anteriores se eliminan: useQuery los gestiona internamente con
  // `refetchInterval: () => isSheetOpen() ? false : 30_000` y
  // `refetchOnWindowFocus: false` (configurado globalmente en App.tsx).
  // `loadData()` se mantiene como API estable para los ~7 callers de
  // mutaciones (verify, dispute, log, delete, etc.) — invalida ambas queries
  // así obtienen datos frescos sin tocar `isLoading`.
  const loadData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks', 'logs', 'all'] }),
    ])
  }, [queryClient])

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

  // v2.6.1 audit 05 1.4 — antes mostrábamos `0/{N}` hardcoded en la
  // sección "Esta semana". Ahora contamos cuántas de esas tareas tienen
  // un log mío esta semana (status pending/verified, no disputed).
  const weekStartIso = toLocalDateString(weekBounds.start)
  const weekEndIso = toLocalDateString(weekBounds.end)
  const myWeekLogsByTaskId = new Set(
    allLogs
      .filter((l) => l.completedBy?.id === user?.id)
      .filter((l) => l.status !== 'disputed')
      .filter((l) => {
        const d = l.date?.toString().slice(0, 10)
        return d ? d >= weekStartIso && d < weekEndIso : false
      })
      .map((l) => l.taskId),
  )
  const weekDoneCount = weekNotTodayTasks.filter((t) =>
    myWeekLogsByTaskId.has(t.id),
  ).length

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
            return (
              <WeekStrip
                days={days}
                onDayClick={(iso) => {
                  const el = document.getElementById(`day-${iso}`)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
                }}
              />
            )
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
                      <b className="text-brand-amber font-extrabold">{weekDoneCount}</b>/{weekNotTodayTasks.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {weekNotTodayTasks.map((task) => {
                      const doneThisWeek = myWeekLogsByTaskId.has(task.id)
                      return (
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
                          doneToday={doneThisWeek}
                          onMark={() => !doneThisWeek && setLoggingTask(task)}
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
