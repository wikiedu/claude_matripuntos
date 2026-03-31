import { useState, useMemo } from 'react'
import { ArrowLeft, AlertCircle, Check } from 'lucide-react'
import {
  calculateActivityPoints,
  COMPENSATIONS,
  getBalanceColor,
  ACTIVITY_BASE_POINTS,
} from '@utils/pointsCalculator'
import type { PointsConfig } from '@utils/pointsCalculator'

export default function RequestActivity({ onBack }: { onBack?: () => void }) {
  // Form state
  const [activityType, setActivityType] = useState('cena')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('19:30')
  const [endTime, setEndTime] = useState('23:30')
  const [description, setDescription] = useState('')
  const [compensation, setCompensation] = useState('none')
  const [activityCategory, setActivityCategory] = useState('ocio')
  const [hasKids, setHasKids] = useState(false)

  // Mock couple config
  const coupleConfig: PointsConfig = {
    numChildren: 2 as 0 | 1 | 2 | 3,
    activityType: activityCategory as any,
    timeSlot: 'noche',
    duration: 4,
  }

  // Calculate duration
  const duration = useMemo(() => {
    if (!startTime || !endTime) return 0
    const [sH, sM] = startTime.split(':').map(Number)
    const [eH, eM] = endTime.split(':').map(Number)
    return (eH + eM / 60) - (sH + sM / 60)
  }, [startTime, endTime])

  // Get start hour for time slot
  const startHour = useMemo(() => {
    if (!startTime) return 0
    const [h] = startTime.split(':').map(Number)
    return h
  }, [startTime])

  // Calculate points
  const pointsCalc = useMemo(() => {
    if (!activityType || !startTime || duration <= 0) return null

    const config: PointsConfig = {
      numChildren: hasKids ? 2 : 0,
      activityType: activityCategory as any,
      timeSlot: 'noche',
      duration,
    }

    return calculateActivityPoints(activityType, startHour, duration, config, compensation)
  }, [activityType, startTime, duration, hasKids, activityCategory, compensation, startHour])

  const activityTypes = [
    { value: 'cena', label: 'Cena + copas', base: 8 },
    { value: 'desayuno', label: 'Desayuno/brunch', base: 2.5 },
    { value: 'deporte', label: 'Deporte/yoga', base: 2.5 },
    { value: 'medico', label: 'Médico/trámite', base: 1.5 },
    { value: 'viaje_fin_semana', label: 'Viaje fin de semana', base: 25 },
    { value: 'despedida', label: 'Despedida de soltero', base: 20 },
  ]

  const categories = [
    { value: 'necesaria', label: 'Necesaria (-30%)', desc: 'Médico, trabajo' },
    { value: 'salud', label: 'Salud (-15%)', desc: 'Deporte, yoga' },
    { value: 'ocio', label: 'Ocio social (base)', desc: 'Cena, fiesta' },
    { value: 'alto_impacto', label: 'Alto impacto (+20%)', desc: 'Despedida, viaje' },
  ]

  const balanceColor = pointsCalc ? getBalanceColor(pointsCalc.total) : 'warning'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Nueva Solicitud de Actividad</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="card space-y-6">
              <h2 className="text-lg font-bold text-gray-900">Detalles de la Solicitud</h2>

              {/* Tipo de Actividad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  1. Tipo de Actividad
                </label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="input-field"
                >
                  {activityTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.base} pts base)
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y Hora */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  2. Fecha y Hora
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Fecha</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input-field mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Hora Inicio</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="input-field mt-1"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-600">Hora Fin</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                {duration > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    ⏱️ Duración: <strong>{duration.toFixed(1)} horas</strong>
                  </p>
                )}
              </div>

              {/* Contexto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  3. Contexto Familiar
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasKids}
                      onChange={(e) => setHasKids(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Con hijos</span>
                  </label>
                  {hasKids && (
                    <span className="text-sm text-gray-600">
                      (Multiplicador: 2 hijos = ×1.8)
                    </span>
                  )}
                </div>
              </div>

              {/* Categoría de Actividad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  4. Categoría
                </label>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label
                      key={cat.value}
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="category"
                        value={cat.value}
                        checked={activityCategory === cat.value}
                        onChange={(e) => setActivityCategory(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{cat.label}</div>
                        <div className="text-xs text-gray-600">{cat.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Justificación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  5. Justificación
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Cuenta por qué quieres hacer esta actividad..."
                  className="input-field h-24"
                />
              </div>

              {/* Compensación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  6. Compensación (Opcional)
                </label>
                <select
                  value={compensation}
                  onChange={(e) => setCompensation(e.target.value)}
                  className="input-field"
                >
                  {COMPENSATIONS.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.label}
                      {comp.discount > 0 && ` (-${(comp.discount * 100).toFixed(0)}%)`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onBack}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  disabled={!pointsCalc || !startDate}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar Solicitud
                </button>
              </div>
            </div>
          </div>

          {/* Cálculo en Tiempo Real */}
          <div className="lg:col-span-1">
            {pointsCalc && (
              <div className={`card border-2 ${
                balanceColor === 'success' ? 'border-success' :
                balanceColor === 'danger' ? 'border-danger' :
                'border-warning'
              }`}>
                <h3 className="font-bold text-gray-900 mb-4">Cálculo en Tiempo Real</h3>

                {/* Desglose */}
                <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm font-mono text-gray-700 space-y-1">
                  {pointsCalc.breakdown.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap">{line}</div>
                  ))}
                </div>

                {/* Total */}
                <div className={`p-4 rounded-lg mb-4 ${
                  balanceColor === 'success' ? 'bg-success bg-opacity-10' :
                  balanceColor === 'danger' ? 'bg-danger bg-opacity-10' :
                  'bg-warning bg-opacity-10'
                }`}>
                  <div className="text-xs text-gray-600 mb-1">TOTAL</div>
                  <div className={`text-3xl font-bold ${
                    balanceColor === 'success' ? 'text-success' :
                    balanceColor === 'danger' ? 'text-danger' :
                    'text-warning'
                  }`}>
                    {pointsCalc.total}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">MATRIPUNTOS</div>
                </div>

                {/* Info */}
                <div className="space-y-2 text-xs text-gray-600 border-t pt-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>
                      {pointsCalc.compensation
                        ? `Con compensación, te costará ${pointsCalc.total} pts`
                        : `Esta solicitud te costará ${pointsCalc.total} pts`}
                    </p>
                  </div>

                  {hasKids && (
                    <div className="flex items-start gap-2 bg-blue-50 p-2 rounded mt-3">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <p className="text-blue-700">
                        Multiplicador aplicado por 2 hijos (×1.8)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!pointsCalc && (
              <div className="card border-2 border-gray-300 text-center py-8">
                <p className="text-gray-600 text-sm">
                  Completa los campos para ver el cálculo
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
