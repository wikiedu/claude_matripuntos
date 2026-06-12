// Tasks page — v2 design (Task 6.1 of v1.4 La Evolución).
// ViewToggle Lista | Semana, CategoryFilterStrip, three sections (Hoy / Esta semana / Catálogo),
// AddTaskSheet for task creation, dark-mode Log/Dispute modals.
// Rendered naked inside AuthedLayout (AppHeader is provided globally).

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isSheetOpen } from '../lib/sheetLock'
import { Loader, X, RefreshCw } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { toLocalDateString } from '../utils/dateUtils'
import { CategoryFilterStrip } from '../components/v2/tasks/CategoryFilterStrip'
import { AddTaskSheet } from '../components/v2/tasks/AddTaskSheet'
import { AddTaskFromCatalogSheet } from '../components/v2/tasks/AddTaskFromCatalogSheet'
import { usePointsBurst } from '../components/v2/dashboard/PointsBurst'
import { MPTabs } from '../components/v2/tasks/MPTabs'
import { HeaderStrip, type FilterValue } from '../components/v2/tasks/HeaderStrip'
import { VerifyBanner } from '../components/v2/tasks/VerifyBanner'
import { RecurringTaskManager } from '../components/v2/tasks/RecurringTaskManager'
import { ConfirmDialog } from '../components/v2/primitives/ConfirmDialog'
import { LogTaskModal } from '../components/v2/tasks/LogTaskModal'
import { DisputeModal } from '../components/v2/tasks/DisputeModal'
import { PendingVerificationList } from '../components/v2/tasks/PendingVerificationList'
import { TodaySection } from '../components/v2/tasks/TodaySection'
import { WeekSection } from '../components/v2/tasks/WeekSection'
import { CatalogSection } from '../components/v2/tasks/CatalogSection'
import { HistoryTab } from '../components/v2/tasks/HistoryTab'
import { TasksWeekView } from '../components/v2/tasks/TasksWeekView'
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
        <TasksWeekView
          weekStart={weekStart}
          onWeekStartChange={setWeekStart}
          filteredTasks={filteredTasks}
        />
      ) : (
        // ── LISTA VIEW ──
        <>
          {/* ── MIS TAREAS TAB ── */}
          {tab === 'mis_tareas' && (
            <div className="space-y-4">
              <CategoryFilterStrip value={cat} onChange={setCat} />

              <PendingVerificationList logs={myPendingLogs} />

              <TodaySection
                todayTasks={todayTasks}
                filteredTasksCount={filteredTasks.length}
                cat={cat}
                myTodayLogs={myTodayLogs}
                myTodayLogsByTask={myTodayLogsByTask}
                pendingThisWeek={weekNotTodayTasks.length}
                onLog={setLoggingTask}
                onDelete={setDeletingTask}
                onOpenCatalog={() => setShowCatalogSheet(true)}
              />

              <WeekSection
                tasks={weekNotTodayTasks}
                doneCount={weekDoneCount}
                myWeekLogsByTaskId={myWeekLogsByTaskId}
                onLog={setLoggingTask}
                onDelete={setDeletingTask}
              />

              <CatalogSection
                catalog={visibleCatalog}
                addingFromCatalog={addingFromCatalog}
                onAdd={handleCreateFromCatalog}
              />
            </div>
          )}

          {/* ── RECURRENTES TAB ── */}
          {tab === 'recurrentes' && (
            <RecurringTaskManager onChanged={loadData} />
          )}


          {/* ── HISTORIAL TAB ── */}
          {tab === 'historial' && (
            <HistoryTab
              logs={historyLogs}
              personFilter={personFilter}
              onPersonFilterChange={setPersonFilter}
            />
          )}
        </>
      )}
      </div> {/* /v2.3.0 wrapper px-4 */}
    </main>
  )
}
