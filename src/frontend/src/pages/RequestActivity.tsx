import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Check, Loader } from 'lucide-react'
import {
  calculateActivityPoints,
  COMPENSATIONS,
  getBalanceColor,
} from '@utils/pointsCalculator'
import type { PointsConfig } from '@utils/pointsCalculator'
import { apiClient } from '../services/apiClient'

export default function RequestActivity({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate()

  // Form state
  const [activityType, setActivityType] = useState('cena')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('19:30')
  const [endTime, setEndTime] = useState('23:30')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [compensation, setCompensation] = useState('none')
  const [activityCategory, setActivityCategory] = useState('ocio')
  const [hasKids, setHasKids] = useState(false)

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pointsCalc || !startDate) {
      setSubmitError('Por favor completa todos los campos')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Create event
      const dateStart = new Date(`${startDate}T${startTime}:00Z`)
      const dateEnd = new Date(`${startDate}T${endTime}:00Z`)

      const eventResponse = await apiClient.events.create({
        type: activityType,
        title: title || `${activityType.charAt(0).toUpperCase() + activityType.slice(1)}`,
        description,
        dateStart: dateStart.toISOString(),
        dateEnd: dateEnd.toISOString(),
        hasChildren: hasKids,
        numChildren: hasKids ? 2 : 0,
        pointsBase: pointsCalc.total,
        compensation: compensation !== 'none' ? compensation : undefined,
        compensationDiscount: pointsCalc.compensation?.discount ? 1 - pointsCalc.compensation.discount : 1.0,
      })

      const eventId = eventResponse.event.id

      // Create negotiation (propose the activity)
      await apiClient.negotiations.create({
        eventId,
        pointsProposed: pointsCalc.total,
        message: description || 'Nueva solicitud de actividad',
      })

      setSubmitSuccess(true)

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar la solicitud'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

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

  // Success view
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full card text-center py-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-success bg-opacity-10 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-success" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Solicitud Enviada!</h2>
          <p className="text-gray-600 mb-4">
            Tu solicitud de actividad ha sido creada y enviada a tu pareja para que la revise.
          </p>
          <p className="text-sm text-gray-500">Redirigiendo al dashboard...</p>
        </div>
      </div>
    )
  }

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
            <form onSubmit={handleSubmit} className="card space-y-6">
              <h2 className="text-lg font-bold text-gray-900">Detalles de la Solicitud</h2>

              {/* Error Alert */}
              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {submitError}
                </div>
              )}

              {/* Tipo de Actividad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  1. Tipo de Actividad
                </label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="input-field"
                  disabled={isSubmitting}
                >
                  {activityTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  2. Título (Opcional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Cena con amigos en el restaurante"
                  className="input-field"
                  disabled={isSubmitting}
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  3. Fecha
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Horario */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="input-field"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora Final
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="input-field"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  4. Categoría
                </label>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label key={cat.value} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="category"
                        value={cat.value}
                        checked={activityCategory === cat.value}
                        onChange={(e) => setActivityCategory(e.target.value)}
                        className="mt-1"
                        disabled={isSubmitting}
                      />
                      <div>
                        <div className="font-medium text-gray-900">{cat.label}</div>
                        <div className="text-sm text-gray-600">{cat.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Hijos */}
              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={hasKids}
                    onChange={(e) => setHasKids(e.target.checked)}
                    disabled={isSubmitting}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    ¿Con 2 hijos a cargo?
                  </span>
                </label>
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  type="button"
                  onClick={onBack}
                  className="btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!pointsCalc || !startDate || isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Solicitud'
                  )}
                </button>
              </div>
            </form>
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
