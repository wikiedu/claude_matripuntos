import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, RotateCcw, AlertCircle, Loader, CheckCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { Button } from '../components/Button'
import { Alert } from '../components/Alert'
import { Card, CardTitle, CardContent, CardDescription } from '../components/Card'

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

export default function Settings({ onBack }: PageProps) {
  const navigate = useNavigate()
  const { user, couple } = useAppStore()
  const [activeTab, setActiveTab] = useState<'basic' | 'points' | 'multipliers' | 'rules' | 'partner'>('basic')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [config, setConfig] = useState<ConfigData>({
    numChildren: couple?.numChildren || 0,
    timezone: 'Europe/Madrid',
    language: couple?.language || 'es',
    tasksConfig: {
      cocina: 2.0,
      limpieza: 1.5,
      compra: 1.5,
      logistica: 1.5,
      cuidado: 2.5,
      baños: 1.0,
    },
    multipliersConfig: {
      activityTypes: {
        cena: 1.0,
        deporte: 0.85,
        trabajo: 1.1,
      },
      franja: {
        mañana: 1.0,
        tarde: 1.2,
        noche: 1.5,
        madrugada: 1.8,
      },
      duracion: {
        corta: 1.0,
        media: 1.15,
        larga: 1.35,
      },
      hijos: {
        '0': 1.0,
        '1': 1.4,
        '2': 1.8,
        '3': 2.2,
      },
    },
  })

  const otherUser = couple?.users?.find((u) => u.id !== user?.id)

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // In a real app, would call:
      // await apiClient.configuration.update(config)

      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setConfig((prev) => ({
        ...prev,
        tasksConfig: {
          cocina: 2.0,
          limpieza: 1.5,
          compra: 1.5,
          logistica: 1.5,
          cuidado: 2.5,
          baños: 1.0,
        },
      }))
      setSuccess('Settings reset to defaults!')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleResetDefaults}>
              <RotateCcw className="w-4 h-4" />
              Restore Defaults
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {success && (
          <Alert type="success" message={success} onClose={() => setSuccess(null)} />
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 flex-wrap">
          {(['basic', 'points', 'multipliers', 'rules', 'partner'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'basic' && 'Basic Info'}
              {tab === 'points' && 'Points Table'}
              {tab === 'multipliers' && 'Multipliers'}
              {tab === 'rules' && 'Rules'}
              {tab === 'partner' && 'Partner'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'basic' && (
          <Card>
            <CardTitle>Basic Information</CardTitle>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Number of Children
                  </label>
                  <select
                    value={config.numChildren}
                    onChange={(e) => setConfig({ ...config, numChildren: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="0">No children</option>
                    <option value="1">1 child</option>
                    <option value="2">2 children</option>
                    <option value="3">3+ children</option>
                  </select>
                  <p className="text-sm text-gray-600 mt-2">
                    This multiplies points for all tasks and events. More children = more work!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Timezone
                  </label>
                  <select
                    value={config.timezone}
                    onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Europe/Madrid">Europe/Madrid (Spain)</option>
                    <option value="Europe/London">Europe/London (UK)</option>
                    <option value="Europe/Paris">Europe/Paris (France)</option>
                    <option value="America/New_York">America/New York (USA)</option>
                    <option value="America/Los_Angeles">America/Los Angeles (USA)</option>
                  </select>
                  <p className="text-sm text-gray-600 mt-2">
                    Used for time slot multipliers and notifications.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Language
                  </label>
                  <select
                    value={config.language}
                    onChange={(e) => setConfig({ ...config, language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'points' && (
          <Card>
            <CardTitle>Points Table (Base Values)</CardTitle>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(config.tasksConfig).map(([task, points]) => (
                  <div key={task} className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-900 mb-2 capitalize">
                        {task}
                      </label>
                      <input
                        type="number"
                        value={points}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            tasksConfig: {
                              ...config.tasksConfig,
                              [task]: parseFloat(e.target.value),
                            },
                          })
                        }
                        step="0.5"
                        min="0.5"
                        max="10"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <span className="text-sm text-gray-600 pb-2">points</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-medium">ℹ️ Final points = Base × Multipliers</p>
                <p>These are the base values. The final points depend on multipliers below.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'multipliers' && (
          <Card>
            <CardTitle>Multipliers (Premium Feature)</CardTitle>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Time Slots (for activities)</h4>
                  <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                    {Object.entries(config.multipliersConfig.franja || {}).map(([slot, factor]) => (
                      <div key={slot} className="flex items-center gap-4">
                        <label className="flex-1 text-sm font-medium text-gray-700 capitalize">
                          {slot}
                        </label>
                        <span className="text-gray-600 text-sm">×{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-800">Premium Feature</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Customize multipliers for your specific situation (premium users).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'rules' && (
          <Card>
            <CardTitle>Negotiation Rules</CardTitle>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Free Negotiation Rounds
                  </label>
                  <input
                    type="number"
                    value="2"
                    disabled
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-500"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Free users get 2 free rounds. Premium users get unlimited rounds.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Maximum Compensation Discount
                  </label>
                  <input
                    type="number"
                    value="30"
                    disabled
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-500"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Maximum discount allowed on any activity (%). Can't go below 1 point.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Maximum Points per Activity
                  </label>
                  <input
                    type="number"
                    value="200"
                    disabled
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-500"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Prevents unrealistic activities from breaking the system.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'partner' && (
          <Card>
            <CardTitle>Partner Information</CardTitle>
            <CardContent>
              {otherUser ? (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-gray-900">Connected Partner</h4>
                    <div className="mt-4 space-y-2">
                      <p className="text-sm">
                        <span className="text-gray-600">Name:</span>{' '}
                        <span className="font-medium">{otherUser.name}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-600">Email:</span>{' '}
                        <span className="font-medium">{otherUser.email}</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-4">
                      Disconnect Partner
                    </label>
                    <Button variant="danger" size="md">
                      <AlertCircle className="w-4 h-4" />
                      Disconnect Partnership
                    </Button>
                    <p className="text-sm text-gray-600 mt-2">
                      ⚠️ This will disconnect you from your partner and archive all history.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="font-medium text-yellow-800">No partner connected yet</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Invite your partner to connect your accounts.
                  </p>
                  <Button variant="primary" size="sm" className="mt-4">
                    Invite Partner
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
