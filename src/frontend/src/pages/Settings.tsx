import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, RotateCcw, AlertCircle, Loader, Info, RefreshCw } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { Button } from '../components/Button'
import { Alert } from '../components/Alert'
import { Card, CardTitle, CardContent } from '../components/Card'

interface ConfigData {
  numChildren: number
  timezone: string
  language: string
  tasksConfig: { [key: string]: number }
  multipliersConfig: { [key: string]: any }
}

interface PageProps {
  onBack?: () => void
}

const TASK_CATEGORY_LABELS: Record<string, string> = {
  cocina: '🍳 Cocina',
  limpieza: '🧹 Limpieza',
  compra: '🛒 Compras',
  logistica: '📋 Logística',
  cuidado: '👶 Cuidado de hijos',
  baños: '🚿 Baños',
  mantenimiento: '🔧 Mantenimiento',
  jardineria: '🌿 Jardín',
  mascotas: '🐾 Mascotas',
}

const TIME_SLOT_LABELS: Record<string, string> = {
  mañana: '☀️ Mañana (6h–14h)',
  tarde: '🌅 Tarde (14h–20h)',
  noche: '🌙 Noche (20h–23h)',
  madrugada: '🌛 Madrugada (0h–6h)',
}

export default function Settings({ onBack }: PageProps) {
  const navigate = useNavigate()
  const { user, couple } = useAppStore()
  const [activeTab, setActiveTab] = useState<'general' | 'tareas' | 'multiplicadores' | 'reglas' | 'pareja'>('general')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [resetState, setResetState] = useState<'idle' | 'requesting' | 'confirming'>('idle')
  const [isResetting, setIsResetting] = useState(false)

  const [config, setConfig] = useState<ConfigData>({
    numChildren: couple?.numChildren || 0,
    timezone: 'Europe/Madrid',
    language: couple?.language || 'es',
    tasksConfig: {
      cocina: 12,
      limpieza: 10,
      compra: 15,
      logistica: 8,
      cuidado: 18,
      baños: 12,
      mantenimiento: 15,
      jardineria: 12,
      mascotas: 8,
    },
    multipliersConfig: {
      franja: {
        mañana: 1.0,
        tarde: 1.1,
        noche: 1.4,
        madrugada: 1.6,
      },
      dia: {
        entre_semana: 1.0,
        fin_de_semana: 1.2,
      },
      hijos: {
        '0': 1.0,
        '1': 1.4,
        '2': 1.8,
        '3+': 2.2,
      },
    },
  })

  const otherUser = couple?.users?.find((u) => u.id !== user?.id)

  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        setIsLoading(true)
        const response = await apiClient.configuration.get()
        if (response.configuration) {
          const c = response.configuration
          setConfig({
            numChildren: c.numChildren ?? couple?.numChildren ?? 0,
            timezone: c.timezone || 'Europe/Madrid',
            language: c.language || 'es',
            tasksConfig: Object.keys(c.tasksConfig || {}).length > 0 ? c.tasksConfig : config.tasksConfig,
            multipliersConfig: Object.keys(c.multipliersConfig || {}).length > 0 ? c.multipliersConfig : config.multipliersConfig,
          })
        }
      } catch (err) {
        console.warn('Could not load configuration:', err)
      } finally {
        setIsLoading(false)
      }
    }
    if (couple?.id) loadConfiguration()
  }, [couple?.id])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await apiClient.configuration.update({
        tasksConfig: config.tasksConfig,
        multipliersConfig: config.multipliersConfig,
      })
      setSuccess('¡Configuración guardada con éxito!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la configuración')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefaults = async () => {
    if (!confirm('¿Restaurar toda la configuración a los valores por defecto?')) return
    try {
      setIsSaving(true)
      await apiClient.configuration.reset()
      const response = await apiClient.configuration.get()
      if (response.configuration) {
        const c = response.configuration
        setConfig({
          numChildren: c.numChildren ?? 0,
          timezone: c.timezone || 'Europe/Madrid',
          language: c.language || 'es',
          tasksConfig: c.tasksConfig || config.tasksConfig,
          multipliersConfig: c.multipliersConfig || config.multipliersConfig,
        })
      }
      setSuccess('✅ Configuración restaurada a valores por defecto')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restaurar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRequestReset = async () => {
    setIsResetting(true)
    setError(null)
    try {
      await apiClient.points.requestReset()
      setResetState('idle')
      setSuccess('📩 Solicitud enviada a tu pareja. Cuando acepte, los puntos se resetearán.')
      setTimeout(() => setSuccess(null), 6000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud')
    } finally {
      setIsResetting(false)
    }
  }

  const handleConfirmReset = async () => {
    setIsResetting(true)
    setError(null)
    try {
      await apiClient.points.confirmReset()
      setResetState('idle')
      setSuccess('🔄 ¡Puntos reseteados a cero! El saldo de ambos empieza desde cero.')
      setTimeout(() => setSuccess(null), 6000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al resetear los puntos')
    } finally {
      setIsResetting(false)
    }
  }

  const TABS = [
    { key: 'general' as const, label: '⚙️ General' },
    { key: 'tareas' as const, label: '🏠 Puntos Tareas' },
    { key: 'multiplicadores' as const, label: '×️ Multiplicadores' },
    { key: 'reglas' as const, label: '📋 Reglas' },
    { key: 'pareja' as const, label: '💑 Tu Pareja' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack || (() => navigate('/dashboard'))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleResetDefaults} disabled={isSaving}>
              <RotateCcw className="w-4 h-4" />
              Restaurar
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
              <Save className="w-4 h-4" />
              Guardar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── GENERAL ── */}
        {activeTab === 'general' && (
          <Card>
            <CardTitle>Configuración General</CardTitle>
            <CardContent>
              <div className="space-y-6">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 py-4">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Cargando configuración...</span>
                  </div>
                ) : (
                  <>
                    {/* Tu info */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Tu cuenta</p>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-medium">Nombre:</span> {user?.name}</p>
                        <p><span className="font-medium">Email:</span> {user?.email}</p>
                        <p><span className="font-medium">Pareja:</span> {couple?.name || `${user?.name} & ${otherUser?.name || '...'}`}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Número de hijos</label>
                      <input
                        type="number"
                        value={config.numChildren}
                        onChange={(e) => setConfig({ ...config, numChildren: Math.max(0, parseInt(e.target.value) || 0) })}
                        min="0"
                        max="20"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Introduce el número exacto de hijos. Cuando hay niños a cargo, las actividades aplican un multiplicador adicional de puntos.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Zona horaria</label>
                      <select
                        value={config.timezone}
                        onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="Europe/Madrid">Europe/Madrid (España)</option>
                        <option value="Europe/London">Europe/London (Reino Unido)</option>
                        <option value="Europe/Paris">Europe/Paris (Francia)</option>
                        <option value="America/New_York">America/New_York (USA Este)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (USA Oeste)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Idioma</label>
                      <select
                        value={config.language}
                        onChange={(e) => setConfig({ ...config, language: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="es">🇪🇸 Español</option>
                        <option value="en">🇬🇧 English</option>
                        <option value="fr">🇫🇷 Français</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── PUNTOS TAREAS ── */}
        {activeTab === 'tareas' && (
          <Card>
            <CardTitle>Puntos Base por Categoría de Tareas</CardTitle>
            <CardContent>
              <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">¿Qué son los puntos base?</p>
                    <p>Cada categoría tiene un valor de referencia. Cuando creas una tarea (ej: "Limpiar el baño" en la categoría <em>Baños</em>), se usa este valor como punto de partida. Los multiplicadores de horario y día se aplican encima.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {Object.entries(config.tasksConfig).map(([cat, pts]) => (
                  <div key={cat} className="flex items-center gap-4">
                    <label className="flex-1 text-sm font-medium text-gray-800">
                      {TASK_CATEGORY_LABELS[cat] || cat}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={pts}
                        onChange={(e) => setConfig({ ...config, tasksConfig: { ...config.tasksConfig, [cat]: parseFloat(e.target.value) } })}
                        step="1"
                        min="1"
                        max="50"
                        className="w-20 text-center px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                      />
                      <span className="text-sm text-gray-500 w-6">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── MULTIPLICADORES ── */}
        {activeTab === 'multiplicadores' && (
          <div className="space-y-5">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-indigo-700">
                  <p className="font-semibold mb-1">¿Cómo funcionan los multiplicadores?</p>
                  <p>Los puntos finales se calculan como: <strong>Base × Franja horaria × Día × Hijos</strong>. Por ejemplo, una actividad de noche en fin de semana con 1 hijo: 15 pts × 1.4 × 1.2 × 1.4 ≈ 35 pts.</p>
                </div>
              </div>
            </div>

            <Card>
              <CardTitle>Franja horaria</CardTitle>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(config.multipliersConfig.franja || {}).map(([slot, factor]) => (
                    <div key={slot} className="flex items-center gap-4">
                      <span className="flex-1 text-sm text-gray-700">{TIME_SLOT_LABELS[slot] || slot}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(((factor as number) / 2) * 100, 100)}%` }} />
                        </div>
                        <span className="font-bold text-indigo-700 w-10 text-right">×{(factor as number).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardTitle>Día de la semana</CardTitle>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(config.multipliersConfig.dia || { entre_semana: 1.0, fin_de_semana: 1.2 }).map(([dia, factor]) => (
                    <div key={dia} className="flex items-center gap-4">
                      <span className="flex-1 text-sm text-gray-700">{dia === 'entre_semana' ? '📅 Entre semana (L–V)' : '🎉 Fin de semana (S–D)'}</span>
                      <span className="font-bold text-indigo-700">×{(factor as number).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardTitle>Hijos a cargo</CardTitle>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(config.multipliersConfig.hijos || {}).map(([n, factor]) => (
                    <div key={n} className="flex items-center gap-4">
                      <span className="flex-1 text-sm text-gray-700">{n === '0' ? '🙋 Sin hijos' : `👶 ${n} hijo${n === '1' ? '' : 's'} a cargo`}</span>
                      <span className="font-bold text-orange-600">×{(factor as number).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── REGLAS ── */}
        {activeTab === 'reglas' && (
          <Card>
            <CardTitle>Reglas del Sistema</CardTitle>
            <CardContent>
              <div className="mb-5 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    Estas son las reglas activas del sistema de puntos. Están optimizadas para un uso justo y equilibrado.
                  </div>
                </div>
              </div>
              <div className="space-y-5">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl">🔄</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Rondas de negociación</p>
                    <p className="text-sm text-gray-600">Cada solicitud de actividad permite <strong>2 rondas</strong> de contra-propuesta antes de decidir. Esto da margen para negociar fechas, compensaciones y condiciones.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl">💰</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Descuento máximo por compensación</p>
                    <p className="text-sm text-gray-600">Una compensación puede reducir el coste de la actividad hasta un máximo del <strong>30%</strong>. Siempre se cobra al menos 1 punto.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl">🏆</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Puntos máximos por actividad</p>
                    <p className="text-sm text-gray-600">Ninguna actividad puede valer más de <strong>500 puntos</strong>, para evitar desequilibrios extremos.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl">✅</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Verificación de tareas</p>
                    <p className="text-sm text-gray-600">Las tareas registradas quedan en estado <em>pendiente</em> hasta que tu pareja las verifique. Solo entonces se suman los puntos al saldo definitivo.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl">⚖️</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Saldo en negativo</p>
                    <p className="text-sm text-gray-600">El saldo puede ser negativo. Indica que esa persona está "en deuda" con la pareja: ha disfrutado de más actividades personales de las que ha compensado con tareas.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── PAREJA ── */}
        {activeTab === 'pareja' && (
          <Card>
            <CardTitle>Tu Pareja</CardTitle>
            <CardContent>
              {otherUser ? (
                <div className="space-y-5">
                  <div className="p-5 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                        {otherUser.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{otherUser.name}</p>
                        <p className="text-sm text-gray-600">{otherUser.email}</p>
                        <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1">✅ Conectado</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Vuestra pareja</p>
                    <p className="text-sm text-gray-600">
                      Nombre: <span className="font-medium">{couple?.name || `${user?.name} & ${otherUser.name}`}</span>
                    </p>
                  </div>

                  {/* Reset de puntos */}
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                    <div className="flex items-start gap-3 mb-3">
                      <RefreshCw className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-800">Solicitar reset de puntos</p>
                        <p className="text-xs text-orange-700 mt-1">
                          Reinicia todos los saldos a cero. Requiere que <strong>{otherUser?.name}</strong> también lo confirme desde su app.
                        </p>
                      </div>
                    </div>

                    {resetState === 'idle' && (
                      <button
                        onClick={() => setResetState('requesting')}
                        className="w-full py-2.5 px-4 border-2 border-orange-400 text-orange-700 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Solicitar reset de puntos
                      </button>
                    )}

                    {resetState === 'requesting' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-orange-100 rounded-lg text-xs text-orange-800">
                          ⚠️ Esto enviará una notificación a <strong>{otherUser?.name}</strong>. Solo cuando ambos hayáis confirmado, los puntos se resetearán a cero permanentemente.
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setResetState('idle')} className="flex-1 py-2 px-3 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
                            Cancelar
                          </button>
                          <button
                            onClick={handleRequestReset}
                            disabled={isResetting}
                            className="flex-1 py-2 px-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {isResetting ? <Loader className="w-3 h-3 animate-spin" /> : null}
                            Enviar solicitud
                          </button>
                        </div>
                        <button
                          onClick={() => setResetState('confirming')}
                          className="w-full py-2 px-3 text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Mi pareja ya ha solicitado el reset → confirmar aquí
                        </button>
                      </div>
                    )}

                    {resetState === 'confirming' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                          🚨 <strong>Acción irreversible.</strong> Al confirmar, todos los puntos de los dos se eliminarán permanentemente. No hay vuelta atrás.
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setResetState('idle')} className="flex-1 py-2 px-3 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
                            Cancelar
                          </button>
                          <button
                            onClick={handleConfirmReset}
                            disabled={isResetting}
                            className="flex-1 py-2 px-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {isResetting ? <Loader className="w-3 h-3 animate-spin" /> : '🗑️'}
                            Confirmar reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Zona de peligro</p>
                    <button className="w-full py-3 px-4 border-2 border-red-300 text-red-700 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Desconectar asociación
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      ⚠️ Esto desconectará vuestra cuenta compartida y archivará todo el historial.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-4xl mb-3">💑</div>
                  <p className="font-semibold text-gray-800 mb-1">Aún no tienes pareja conectada</p>
                  <p className="text-sm text-gray-500 mb-5">Invita a tu pareja para empezar a compartir el sistema de puntos</p>
                  <button className="btn-primary mx-auto">Invitar a mi pareja</button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
