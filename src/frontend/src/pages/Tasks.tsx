import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, CheckCircle, Clock, Loader, X,
  ChevronDown, ChevronUp, Search, AlertTriangle, RefreshCw,
  CheckCheck, HelpCircle
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Task {
  id: string
  name: string
  category: string
  pointsBase: string
  description?: string
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

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  cocina: '🍳', limpieza: '🧹', compra: '🛒', logistica: '📋',
  cuidado: '👶', baños: '🚿', mantenimiento: '🔧', jardineria: '🌿', mascotas: '🐾',
}
const CATEGORY_LABEL: Record<string, string> = {
  cocina: 'Cocina', limpieza: 'Limpieza', compra: 'Compras', logistica: 'Logística',
  cuidado: 'Cuidado hijos', baños: 'Baños', mantenimiento: 'Mantenimiento',
  jardineria: 'Jardín', mascotas: 'Mascotas',
}

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
    { name: 'Sacar a pasear al perro', pts: 8 }, { name: 'Dar de comer a la mascota', pts: 4 },
    { name: 'Limpiar zona de la mascota', pts: 8 }, { name: 'Llevar al veterinario', pts: 12 },
  ]},
]

// ─── Log task modal ───────────────────────────────────────────────────────────
function LogTaskModal({ task, onClose, onSuccess }: {
  task: Task; onClose: () => void; onSuccess: () => void
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
        modifierValue: modMap[modifier],
        pointsFinal: finalPts,
      })
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Registrar tarea</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-3">
          <span className="text-2xl">{CATEGORY_EMOJI[task.category] || '✅'}</span>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{task.name}</div>
            <div className="text-xs text-gray-500">{CATEGORY_LABEL[task.category] || task.category}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{finalPts}</div>
            <div className="text-xs text-gray-400">pts</div>
          </div>
        </div>

        {/* Info: pending verification */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
          ℹ️ Los puntos se acreditarán cuando tu pareja <strong>verifique</strong> la tarea. Recibirás notificación.
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

        <div className="mb-5 space-y-2">
          <p className="text-sm font-medium text-gray-700 mb-2">¿Cómo fue?</p>
          {([
            { value: 'none' as const, label: '✔️ Normal', desc: `${base} pts`, border: 'border-gray-400' },
            { value: 'extra' as const, label: '⭐ Esfuerzo extra', desc: `+30% → ${Math.round(base * 1.3)} pts`, border: 'border-green-400' },
            { value: 'partial' as const, label: '🔸 Parcial', desc: `−30% → ${Math.round(base * 0.7)} pts`, border: 'border-orange-400' },
          ]).map(opt => (
            <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${modifier === opt.value ? `${opt.border} bg-gray-50` : 'border-gray-200'}`}>
              <input type="radio" name="modifier" checked={modifier === opt.value} onChange={() => setModifier(opt.value)} className="sr-only" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </div>
              {modifier === opt.value && <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />}
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary" disabled={isSubmitting}>Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
            {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Registrar (+{finalPts} pts)
          </button>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">⚠️ Disputar tarea</h3>
        <p className="text-sm text-gray-600 mb-4">
          Disputando <strong>{log.taskName}</strong> de <strong>{log.completedBy?.name}</strong> ({log.pointsFinal} pts)
        </p>
        {error && <div className="mb-3 p-3 bg-red-50 rounded-xl text-red-700 text-sm">{error}</div>}
        <label className="text-sm font-medium text-gray-700 mb-1 block">Motivo (opcional)</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          placeholder="¿Por qué cuestionas esta tarea?" rows={3}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary" disabled={isSubmitting}>Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-1">
            {isSubmitting ? <Loader className="w-3 h-3 animate-spin" /> : '⚠️'} Disputar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Tasks({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate()
  const { couple, user } = useAppStore()

  const [tasks, setTasks] = useState<Task[]>([])
  const [allLogs, setAllLogs] = useState<TaskLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<'mis_tareas' | 'verificar' | 'historial'>('mis_tareas')

  // Modals
  const [loggingTask, setLoggingTask] = useState<Task | null>(null)
  const [disputingLog, setDisputingLog] = useState<TaskLog | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  // Add task UI
  const [showCatalog, setShowCatalog] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogFilter, setCatalogFilter] = useState('all')
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('cocina')
  const [newTaskPoints, setNewTaskPoints] = useState('10')
  const [isCreating, setIsCreating] = useState(false)
  const [addingFromCatalog, setAddingFromCatalog] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!couple?.id) return
    try {
      setIsLoading(true)
      setError(null)
      const [tasksRes, logsRes] = await Promise.all([
        apiClient.tasks.getAll(),
        apiClient.tasks.getAllLogs(),
      ])
      setTasks(tasksRes.tasks || [])
      setAllLogs(logsRes.logs || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando tareas')
    } finally {
      setIsLoading(false)
    }
  }, [couple?.id])

  useEffect(() => { loadData() }, [loadData])

  // ─── Derived state ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]

  // My completions today (for task status in the list)
  const myTodayLogs = allLogs.filter(
    l => l.completedBy?.id === user?.id && l.date?.toString().startsWith(today)
  )
  const myTodayLogsByTask = new Map(myTodayLogs.map(l => [l.taskId, l]))

  // My pending logs (I completed, waiting for partner's verification)
  const myPendingLogs = allLogs.filter(
    l => l.completedBy?.id === user?.id && l.status === 'pending'
  )

  // Partner's pending logs (they completed, I need to verify)
  const partnerPendingLogs = allLogs.filter(
    l => l.completedBy?.id !== user?.id && l.status === 'pending'
  )

  // All resolved logs
  const historyLogs = allLogs.filter(l => l.status !== 'pending')

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleLogSuccess = async () => {
    setLoggingTask(null)
    setSuccess('✅ Tarea registrada. Tu pareja recibirá una notificación para verificarla.')
    setTimeout(() => setSuccess(null), 5000)
    await loadData()
  }

  const handleVerify = async (log: TaskLog) => {
    setVerifyingId(log.id)
    setError(null)
    try {
      await apiClient.tasks.verifyLog(log.taskId, log.id)
      setSuccess(`✅ Verificado. +${log.pointsFinal} pts para ${log.completedBy?.name}`)
      setTimeout(() => setSuccess(null), 5000)
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al verificar')
    } finally {
      setVerifyingId(null)
    }
  }

  const handleDisputeSuccess = async () => {
    setDisputingLog(null)
    setSuccess('⚠️ Tarea disputada. Se notificará a tu pareja.')
    setTimeout(() => setSuccess(null), 4000)
    await loadData()
  }

  const handleCreateTask = async (name: string, category: string, pts: number, desc?: string) => {
    setIsCreating(true)
    try {
      await apiClient.tasks.create({ name: name.trim(), category, pointsBase: pts, description: desc?.trim() })
      setShowNewTask(false)
      setShowCatalog(false)
      setNewTaskName(''); setNewTaskCategory('cocina'); setNewTaskPoints('10')
      setSuccess('✅ Tarea añadida a tu lista')
      setTimeout(() => setSuccess(null), 3000)
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creando tarea')
    } finally {
      setIsCreating(false)
      setAddingFromCatalog(null)
    }
  }

  const existingTaskNames = new Set(tasks.map(t => t.name.toLowerCase()))
  const filteredCatalog = TASK_CATALOG
    .filter(g => catalogFilter === 'all' || g.category === catalogFilter)
    .map(g => ({
      ...g,
      tasks: g.tasks.filter(t =>
        !existingTaskNames.has(t.name.toLowerCase()) &&
        (!catalogSearch || t.name.toLowerCase().includes(catalogSearch.toLowerCase()))
      )
    }))
    .filter(g => g.tasks.length > 0)

  const catKeys = Object.keys(CATEGORY_EMOJI)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modals */}
      {loggingTask && (
        <LogTaskModal task={loggingTask} onClose={() => setLoggingTask(null)} onSuccess={handleLogSuccess} />
      )}
      {disputingLog && (
        <DisputeModal log={disputingLog} onClose={() => setDisputingLog(null)} onSuccess={handleDisputeSuccess} />
      )}

      {/* Catalog modal */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold">Añadir tarea predefinida</h3>
              <button onClick={() => setShowCatalog(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setCatalogFilter('all')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${catalogFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>Todas</button>
                {catKeys.map(c => (
                  <button key={c} onClick={() => setCatalogFilter(c)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${catalogFilter === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-sm">No hay tareas disponibles{catalogSearch ? ` para "${catalogSearch}"` : ''}</p>
                </div>
              ) : filteredCatalog.map(group => (
                <div key={group.category} className="mb-5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{CATEGORY_EMOJI[group.category]} {CATEGORY_LABEL[group.category]}</p>
                  <div className="space-y-2">
                    {group.tasks.map(task => (
                      <div key={task.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.name}</p>
                          {task.desc && <p className="text-xs text-gray-400">{task.desc}</p>}
                        </div>
                        <span className="text-sm font-bold text-primary">{task.pts} pts</span>
                        <button onClick={() => { setAddingFromCatalog(task.name); handleCreateTask(task.name, group.category, task.pts, task.desc) }}
                          disabled={isCreating} className="py-1.5 px-3 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50 flex items-center gap-1">
                          {addingFromCatalog === task.name ? <Loader className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Añadir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={onBack || (() => navigate('/dashboard'))} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Tareas del Hogar</h1>
            <p className="text-sm text-gray-500">{tasks.length} tareas · {myTodayLogs.length} hechas hoy</p>
          </div>
          <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-lg" title="Actualizar">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={() => setShowCatalog(true)} className="btn-secondary py-2 px-3 text-sm flex items-center gap-1.5">
            <Search className="w-4 h-4" /> <span className="hidden sm:inline">Catálogo</span>
          </button>
          <button onClick={() => setShowNewTask(!showNewTask)} className="btn-primary py-2 px-3 text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nueva</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { key: 'mis_tareas' as const, label: '✅ Mis Tareas', badge: myTodayLogs.length },
              { key: 'verificar' as const, label: '👀 Verificar', badge: partnerPendingLogs.length },
              { key: 'historial' as const, label: '📋 Historial', badge: null },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                {t.label}
                {t.badge !== null && t.badge > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-primary text-white' : 'bg-red-500 text-white'}`}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex justify-between">
            {error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>
        )}

        {/* New task form */}
        {showNewTask && (
          <div className="card mb-5 border-2 border-primary border-opacity-30">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Crear tarea personalizada</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="Ej: Limpiar la nevera" className="input-field" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Categoría</label>
                <select value={newTaskCategory} onChange={e => setNewTaskCategory(e.target.value)} className="input-field">
                  {catKeys.map(c => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Puntos base</label>
                <input type="number" value={newTaskPoints} onChange={e => setNewTaskPoints(e.target.value)} min="1" max="50" className="input-field" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNewTask(false)} className="btn-secondary flex-1" disabled={isCreating}>Cancelar</button>
              <button onClick={() => handleCreateTask(newTaskName, newTaskCategory, parseFloat(newTaskPoints) || 10)}
                disabled={!newTaskName.trim() || isCreating}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {isCreating ? <Loader className="w-4 h-4 animate-spin" /> : null} Crear tarea
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-8 h-8 text-primary animate-spin mr-2" />
            <span className="text-gray-500">Cargando tareas...</span>
          </div>
        ) : (
          <>
            {/* ── MIS TAREAS TAB ── */}
            {tab === 'mis_tareas' && (
              <div className="space-y-4">
                {/* My pending (waiting for partner verification) */}
                {myPendingLogs.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Mis tareas pendientes de verificación ({myPendingLogs.length})
                    </p>
                    <div className="space-y-2">
                      {myPendingLogs.map(log => (
                        <div key={log.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{CATEGORY_EMOJI[log.taskCategory] || '✅'}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{log.taskName}</p>
                              <p className="text-xs text-gray-500">{new Date(log.date).toLocaleDateString('es-ES', { day:'numeric', month:'short' })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-sm font-bold text-yellow-700">+{log.pointsFinal} pts</span>
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">⏳ Pendiente</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                {tasks.length > 0 && (
                  <div className="card py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progreso de hoy</span>
                      <span className="text-sm font-bold text-primary">{myTodayLogs.length}/{tasks.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(myTodayLogs.length / tasks.length) * 100}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {myTodayLogs.length === 0 ? 'Ninguna tarea hecha hoy todavía' :
                       myTodayLogs.length === tasks.length ? '🎉 ¡Todas las tareas completadas hoy!' :
                       `${tasks.length - myTodayLogs.length} tarea${tasks.length - myTodayLogs.length !== 1 ? 's' : ''} restante${tasks.length - myTodayLogs.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                )}

                {/* Task list */}
                {tasks.length === 0 ? (
                  <div className="card text-center py-12">
                    <div className="text-4xl mb-3">🏠</div>
                    <p className="font-semibold text-gray-700 mb-1">Sin tareas en tu lista</p>
                    <p className="text-sm text-gray-500 mb-5">Añade tareas del catálogo o crea las tuyas</p>
                    <button onClick={() => setShowCatalog(true)} className="btn-primary mx-auto flex items-center gap-2">
                      <Search className="w-4 h-4" /> Ver catálogo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map(task => {
                      const myLog = myTodayLogsByTask.get(task.id)
                      const doneToday = !!myLog
                      const isExpanded = expandedTask === task.id

                      // Status badge
                      const badge = doneToday
                        ? myLog?.status === 'verified'
                          ? { text: '✅ Verificado', color: 'bg-green-100 text-green-700' }
                          : myLog?.status === 'disputed'
                            ? { text: '⚠️ Disputado', color: 'bg-orange-100 text-orange-700' }
                            : { text: '⏳ Pendiente', color: 'bg-yellow-100 text-yellow-700' }
                        : null

                      return (
                        <div key={task.id} className={`card transition-all ${doneToday ? 'opacity-70' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${doneToday ? 'bg-green-100' : 'bg-gray-100'}`}>
                              {doneToday ? '✅' : (CATEGORY_EMOJI[task.category] || '🏠')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-semibold truncate ${doneToday ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.name}</p>
                                {badge && <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${badge.color}`}>{badge.text}</span>}
                              </div>
                              <p className="text-sm text-gray-500">{CATEGORY_LABEL[task.category] || task.category} · {task.pointsBase} pts base</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {task.description && (
                                <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                              <button onClick={() => !doneToday && setLoggingTask(task)} disabled={doneToday}
                                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                                  doneToday ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-opacity-90'
                                }`}>
                                <CheckCircle className="w-4 h-4" />
                                {doneToday ? 'Hecha' : 'Marcar'}
                              </button>
                            </div>
                          </div>
                          {isExpanded && task.description && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-sm text-gray-600">{task.description}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── VERIFICAR TAB ── */}
            {tab === 'verificar' && (
              <div className="space-y-4">
                {/* Partner tasks waiting for my verification */}
                {partnerPendingLogs.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-500">
                      Tu pareja ha completado {partnerPendingLogs.length} tarea{partnerPendingLogs.length !== 1 ? 's' : ''} que esperan tu verificación
                    </p>
                    {partnerPendingLogs.map(log => (
                      <div key={log.id} className="card border-l-4 border-purple-400">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{CATEGORY_EMOJI[log.taskCategory] || '✅'}</span>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{log.taskName}</p>
                                <p className="text-sm text-gray-500">
                                  {log.completedBy?.name} · {new Date(log.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  {log.modifier && log.modifier !== 'none' && (
                                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${log.modifier === 'extra' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                      {log.modifier === 'extra' ? '⭐ Extra +30%' : '🔸 Parcial −30%'}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <div className="text-xl font-bold text-purple-600">+{log.pointsFinal}</div>
                            <div className="text-xs text-gray-400">pts</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleVerify(log)} disabled={verifyingId === log.id}
                            className="flex-1 py-2.5 px-3 bg-green-100 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-200 disabled:opacity-50 flex items-center justify-center gap-1.5">
                            {verifyingId === log.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                            Verificar (+{log.pointsFinal} pts)
                          </button>
                          <button onClick={() => setDisputingLog(log)} disabled={verifyingId === log.id}
                            className="flex-1 py-2.5 px-3 bg-orange-100 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-200 disabled:opacity-50 flex items-center justify-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> Disputar
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="card text-center py-14">
                    <div className="text-5xl mb-3">✨</div>
                    <p className="font-semibold text-gray-700">Todo verificado</p>
                    <p className="text-sm text-gray-500 mt-1">No hay tareas de tu pareja pendientes de verificar</p>
                  </div>
                )}

                {/* Divider — partner waiting for MY verification */}
                {myPendingLogs.length > 0 && (
                  <div className="mt-6">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" /> Mis tareas esperando tu pareja ({myPendingLogs.length})
                    </h2>
                    <div className="space-y-2">
                      {myPendingLogs.map(log => (
                        <div key={log.id} className="card py-3 opacity-70">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800">{log.taskName}</p>
                              <p className="text-xs text-gray-500">{new Date(log.date).toLocaleDateString('es-ES', { day:'numeric', month:'short' })} · ⏳ Esperando verificación</p>
                            </div>
                            <span className="text-sm font-bold text-gray-400">+{log.pointsFinal} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORIAL TAB ── */}
            {tab === 'historial' && (
              <div className="space-y-2">
                {historyLogs.length === 0 ? (
                  <div className="card text-center py-12">
                    <div className="text-4xl mb-3">📜</div>
                    <p className="font-semibold text-gray-700">Sin historial todavía</p>
                    <p className="text-sm text-gray-500">Las tareas verificadas y disputadas aparecerán aquí</p>
                  </div>
                ) : historyLogs.map(log => (
                  <div key={log.id} className="card py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            log.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {log.status === 'verified' ? '✅ Verificada' : '⚠️ Disputada'}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 truncate">{log.taskName}</p>
                        <p className="text-xs text-gray-500">
                          {log.completedBy?.name} · {new Date(log.date).toLocaleDateString('es-ES', { day:'numeric', month:'short' })}
                          {log.verifiedBy && ` · ✓ ${log.verifiedBy.name}`}
                        </p>
                        {log.disputeReason && <p className="text-xs text-orange-600 mt-0.5">💬 "{log.disputeReason}"</p>}
                      </div>
                      <div className="ml-3 text-right">
                        <div className={`font-bold text-sm ${log.status === 'verified' ? 'text-green-600' : 'text-gray-400'}`}>
                          {log.status === 'verified' ? `+${log.pointsFinal}` : log.pointsFinal} pts
                        </div>
                        <div className="text-xs text-gray-400">{log.completedBy?.name}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
