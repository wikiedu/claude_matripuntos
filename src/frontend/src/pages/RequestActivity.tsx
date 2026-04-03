import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader, ChevronDown, ChevronRight, Clock, Calendar, Tag, MessageSquare, Gift, Users } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'

interface Category {
  id: string
  name: string
  emoji: string
  type: string
  basePoints: number
  description?: string
  subcategories?: Subcategory[]
}

interface Subcategory {
  id: string
  name: string
  basePointsModifier: number
}

function getTimeMultiplier(hour: number, minute: number = 0): number {
  const totalMinutes = hour * 60 + minute
  if (totalMinutes >= 7*60 && totalMinutes < 9*60+30) return 1.4   // 07:00-09:30
  if (totalMinutes >= 9*60+30 && totalMinutes < 17*60+30) return 1.0 // 09:30-17:30
  if (totalMinutes >= 17*60+30 && totalMinutes < 21*60+30) return 1.5 // 17:30-21:30
  if (totalMinutes >= 21*60+30 || totalMinutes < 1*60) return 1.2   // 21:30-01:00
  return 1.6 // 01:00-07:00
}

function getTimeSlotLabel(hour: number, minute: number = 0): string {
  const totalMinutes = hour * 60 + minute
  if (totalMinutes >= 7*60 && totalMinutes < 9*60+30) return 'Mañana temprano ×1.4'
  if (totalMinutes >= 9*60+30 && totalMinutes < 17*60+30) return 'Horario normal ×1.0'
  if (totalMinutes >= 17*60+30 && totalMinutes < 21*60+30) return 'Tarde-noche ×1.5'
  if (totalMinutes >= 21*60+30 || totalMinutes < 1*60) return 'Noche ×1.2'
  return 'Madrugada ×1.6'
}

function getDayMultiplier(dateStr: string): number {
  if (!dateStr) return 1.0
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  return (day === 0 || day === 6) ? 1.2 : 1.0
}

function getDayLabel(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  return (day === 0 || day === 6) ? 'Fin de semana ×1.2' : 'Entre semana ×1.0'
}

function getChildrenMultiplier(n: number): number {
  if (n <= 0) return 1.0
  if (n === 1) return 1.4
  if (n === 2) return 1.8
  return 2.2
}

const COMPENSATIONS = [
  { id: 'none', label: 'Sin compensación', discount: 0 },
  { id: 'cocinar', label: '🍳 Cocinar la cena de la semana', discount: 0.15 },
  { id: 'tareas', label: '🧹 Tareas extra esa semana', discount: 0.20 },
  { id: 'masaje', label: '💆 Masaje de espalda', discount: 0.10 },
  { id: 'desayuno', label: '☕ Desayuno en cama', discount: 0.10 },
  { id: 'noche_libre', label: '🌙 Noche libre para tu pareja', discount: 0.25 },
]

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'gastro', name: 'Gastronomía', emoji: '🍽️', type: 'event', basePoints: 15, subcategories: [
    { id: 's1', name: 'Cena romántica (los dos solos)', basePointsModifier: 5 },
    { id: 's2', name: 'Celebración especial', basePointsModifier: 8 },
    { id: 's3', name: 'Brunch / vermut', basePointsModifier: -2 },
    { id: 's4', name: 'Cena con amigos', basePointsModifier: -3 },
    { id: 's5', name: 'Cena familiar', basePointsModifier: -5 },
    { id: 's6', name: 'Copas / after', basePointsModifier: -6 },
  ]},
  { id: 'travel', name: 'Escapadas & Viajes', emoji: '✈️', type: 'event', basePoints: 25, subcategories: [
    { id: 's7', name: 'Viaje largo +4 días', basePointsModifier: 15 },
    { id: 's8', name: 'Fin de semana escapada', basePointsModifier: 5 },
    { id: 's9', name: 'Día fuera de la ciudad', basePointsModifier: -5 },
    { id: 's10', name: 'Viaje de trabajo', basePointsModifier: -12 },
  ]},
  { id: 'culture', name: 'Ocio & Cultura', emoji: '🎭', type: 'event', basePoints: 12, subcategories: [
    { id: 's11', name: 'Concierto / festival', basePointsModifier: 3 },
    { id: 's12', name: 'Teatro / ópera', basePointsModifier: 2 },
    { id: 's13', name: 'Exposición / museo', basePointsModifier: -2 },
    { id: 's14', name: 'Cine', basePointsModifier: -4 },
    { id: 's15', name: 'Evento deportivo (espectador)', basePointsModifier: -2 },
  ]},
  { id: 'sport', name: 'Deporte & Bienestar', emoji: '🏋️', type: 'event', basePoints: 10, subcategories: [
    { id: 's16', name: 'Spa / masaje', basePointsModifier: 3 },
    { id: 's17', name: 'Deporte en equipo', basePointsModifier: 0 },
    { id: 's18', name: 'Yoga / pilates', basePointsModifier: -1 },
    { id: 's19', name: 'Running / ciclismo', basePointsModifier: -2 },
    { id: 's20', name: 'Gym / fitness', basePointsModifier: -3 },
  ]},
  { id: 'social', name: 'Social', emoji: '🎉', type: 'event', basePoints: 18, subcategories: [
    { id: 's21', name: 'Boda / comunión', basePointsModifier: 8 },
    { id: 's22', name: 'Despedida de soltero/a', basePointsModifier: 5 },
    { id: 's23', name: 'Cumpleaños amigo/a', basePointsModifier: 0 },
    { id: 's24', name: 'Reunión familiar', basePointsModifier: -5 },
    { id: 's25', name: 'Afterwork / copas', basePointsModifier: -3 },
  ]},
  { id: 'leisure', name: 'Ocio Personal', emoji: '🎮', type: 'event', basePoints: 8, subcategories: [
    { id: 's26', name: 'Hobbies propios', basePointsModifier: 0 },
    { id: 's27', name: 'Videojuegos / series', basePointsModifier: -2 },
    { id: 's28', name: 'Lectura / descanso', basePointsModifier: -3 },
  ]},
]

// Calculate duration multiplier based on number of days
function getDurationMultiplier(days: number): number {
  if (days <= 1) return 1.0
  if (days === 2) return 1.7
  if (days === 3) return 2.3
  if (days <= 5) return 2.8 + (days - 3) * 0.3
  return Math.min(3.5 + (days - 5) * 0.2, 6.0) // cap at 6x for very long trips
}

function getDurationLabel(days: number): string {
  if (days <= 1) return ''
  if (days === 2) return '2 días ×1.7'
  if (days === 3) return '3 días ×2.3'
  return `${days} días ×${getDurationMultiplier(days).toFixed(1)}`
}

// Calculate points with a safe floor so result is never NaN or <1
function calcPoints(base: number, subMod: number, timeMult: number, dayMult: number, childMult: number, compDiscount: number, durationMult: number = 1.0): number {
  const effectiveBase = Math.max(1, base + subMod)
  return Math.min(Math.round(effectiveBase * timeMult * dayMult * childMult * durationMult * (1 - compDiscount)), 999)
}

export default function RequestActivity({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate()
  const { user, couple } = useAppStore()

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCats, setIsLoadingCats] = useState(true)

  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('20:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('23:30')
  const [multiDay, setMultiDay] = useState(false)
  const [withChildren, setWithChildren] = useState(false)
  const [compensation, setCompensation] = useState('none')
  const [showBreakdown, setShowBreakdown] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const numChildren = useMemo(() => couple?.children?.length ?? 0, [couple])
  const partnerName = couple?.users?.find(u => u.id !== user?.id)?.name || 'tu pareja'

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingCats(true)
        const res = await apiClient.categories.getAll()
        const cats = (res.categories || res || []).filter((c: Category) => c.type === 'event')
        if (cats.length > 0) {
          setCategories(cats)
          setSelectedCategoryId(cats[0].id)
        } else throw new Error('empty')
      } catch {
        setCategories(FALLBACK_CATEGORIES)
        setSelectedCategoryId(FALLBACK_CATEGORIES[0].id)
      } finally {
        setIsLoadingCats(false)
      }
    }
    load()
  }, [])

  const selectedCat = useMemo(() => categories.find(c => c.id === selectedCategoryId), [categories, selectedCategoryId])
  const selectedSub = useMemo(() => selectedCat?.subcategories?.find(s => s.id === selectedSubcategoryId), [selectedCat, selectedSubcategoryId])

  // Number of days for multi-day events
  const numDays = useMemo(() => {
    if (!multiDay || !startDate || !endDate) return 1
    const diff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    return Math.max(1, Math.round(diff) + 1)
  }, [multiDay, startDate, endDate])

  const pointsCalc = useMemo(() => {
    if (!selectedCat || !startDate || !startTime) return null

    const [hourStr, minuteStr] = startTime.split(':')
    const hour = parseInt(hourStr)
    const minute = parseInt(minuteStr) || 0
    const timeMult = getTimeMultiplier(hour, minute)
    const dayMult = getDayMultiplier(startDate)
    const childMult = withChildren ? getChildrenMultiplier(numChildren || 1) : 1.0
    const compDiscount = COMPENSATIONS.find(c => c.id === compensation)?.discount ?? 0
    const subMod = selectedSub?.basePointsModifier ?? 0
    const durationMult = getDurationMultiplier(numDays)
    const total = calcPoints(selectedCat.basePoints, subMod, timeMult, dayMult, childMult, compDiscount, durationMult)

    return {
      basePoints: selectedCat.basePoints,
      subMod,
      effectiveBase: Math.max(1, selectedCat.basePoints + subMod),
      timeMult, dayMult, childMult, compDiscount, durationMult, numDays, total,
      timeLabel: getTimeSlotLabel(hour, minute),
      dayLabel: getDayLabel(startDate),
      durationLabel: getDurationLabel(numDays),
    }
  }, [selectedCat, selectedSub, startDate, startTime, withChildren, numChildren, compensation, numDays])

  // Helper: preview final pts for a subcategory (given current date/time/etc)
  const previewSubPts = (subMod: number) => {
    if (!selectedCat || !startDate || !startTime) return null
    const [hourStr2, minuteStr2] = startTime.split(':')
    const hour = parseInt(hourStr2)
    const minute = parseInt(minuteStr2) || 0
    const timeMult = getTimeMultiplier(hour, minute)
    const dayMult = getDayMultiplier(startDate)
    const childMult = withChildren ? getChildrenMultiplier(numChildren || 1) : 1.0
    const compDiscount = COMPENSATIONS.find(c => c.id === compensation)?.discount ?? 0
    const durationMult = getDurationMultiplier(numDays)
    return calcPoints(selectedCat.basePoints, subMod, timeMult, dayMult, childMult, compDiscount, durationMult)
  }

  const handleCategoryChange = (id: string) => {
    setSelectedCategoryId(id)
    setSelectedSubcategoryId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pointsCalc || !startDate || !selectedCategoryId) {
      setSubmitError('Completa todos los campos obligatorios')
      return
    }
    if (multiDay && !endDate) {
      setSubmitError('Indica la fecha de fin de la actividad')
      return
    }
    if (multiDay && endDate && endDate < startDate) {
      setSubmitError('La fecha de fin debe ser posterior a la de inicio')
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const dateStart = new Date(`${startDate}T${startTime}:00`)
      const actualEndDate = multiDay && endDate ? endDate : startDate
      const dateEnd = new Date(`${actualEndDate}T${endTime}:00`)
      // If end time is before start time on same day, add 1 day
      if (!multiDay && dateEnd <= dateStart) {
        dateEnd.setDate(dateEnd.getDate() + 1)
      }

      const eventResponse = await apiClient.events.create({
        type: selectedCat!.name.toLowerCase().replace(/\s+/g, '_').replace(/&/g, 'y').replace(/[^a-z0-9_]/g, ''),
        title: title || `${selectedCat!.emoji} ${selectedSub?.name || selectedCat!.name}`,
        description,
        dateStart: dateStart.toISOString(),
        dateEnd: dateEnd.toISOString(),
        hasChildren: withChildren,
        numChildren: withChildren ? (numChildren || 1) : 0,
        pointsBase: pointsCalc.total,
        compensation: compensation !== 'none' ? compensation : undefined,
        compensationDiscount: 1 - pointsCalc.compDiscount,
      })

      const eventId = eventResponse.event?.id || eventResponse.id
      // Use V1 negotiation system (creates Negotiation record, sets event to 'pending')
      await apiClient.negotiations.create({
        eventId,
        pointsProposed: pointsCalc.total,
        message: description || title || `${selectedCat!.emoji} ${selectedSub?.name || selectedCat!.name}`,
      })

      setSubmitSuccess(true)
      setTimeout(() => { if (onBack) onBack(); else navigate('/dashboard') }, 2000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al enviar la solicitud')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full card text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Solicitud Enviada!</h2>
          <p className="text-gray-600 mb-4">
            Tu solicitud ha sido enviada a <strong>{partnerName}</strong> para que la revise.
          </p>
          <p className="text-sm text-gray-400">Redirigiendo al dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={onBack || (() => navigate('/dashboard'))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Solicitar Actividad</h1>
            <p className="text-sm text-gray-500">Propone un plan a {partnerName}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT: Form */}
            <div className="lg:col-span-2 space-y-5">

              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{submitError}</div>
              )}

              {/* Categoría */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-5 h-5 text-purple-600" />
                  <h2 className="font-semibold text-gray-900">Tipo de actividad</h2>
                </div>
                {isLoadingCats ? (
                  <div className="flex items-center gap-2 text-gray-500 py-4">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Cargando categorías...</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                      {categories.map(cat => (
                        <button key={cat.id} type="button" onClick={() => handleCategoryChange(cat.id)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            selectedCategoryId === cat.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="text-2xl mb-1">{cat.emoji}</div>
                          <div className="text-xs font-semibold text-gray-900 leading-tight">{cat.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{cat.basePoints} pts base</div>
                        </button>
                      ))}
                    </div>

                    {selectedCat?.subcategories && selectedCat.subcategories.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">¿Qué tipo concretamente?</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedCat.subcategories.map(sub => {
                            const preview = previewSubPts(sub.basePointsModifier)
                            const isSelected = selectedSubcategoryId === sub.id
                            return (
                              <button key={sub.id} type="button"
                                onClick={() => setSelectedSubcategoryId(sub.id === selectedSubcategoryId ? '' : sub.id)}
                                className={`p-2.5 rounded-lg border text-left text-sm transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'border-purple-400 bg-purple-50 text-purple-800'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                }`}
                              >
                                <span>{sub.name}</span>
                                <span className={`text-xs font-bold ml-2 flex-shrink-0 ${
                                  isSelected ? 'text-purple-700' : 'text-gray-500'
                                }`}>
                                  {preview !== null && startDate
                                    ? `${preview} pts`
                                    : `${Math.max(1, selectedCat!.basePoints + sub.basePointsModifier)} pts`}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                        {!startDate && (
                          <p className="text-xs text-gray-400 mt-2">💡 Selecciona una fecha para ver los puntos exactos de cada opción</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Descripción */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Descripción</h2>
                </div>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={selectedCat ? `Ej: ${selectedCat.emoji} ${selectedSub?.name || selectedCat.name}` : 'Título del plan'}
                  className="input-field mb-3" disabled={isSubmitting}
                />
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="¿Por qué quieres hacer esto? Justifica a tu pareja el motivo..."
                  className="input-field h-20 resize-none" disabled={isSubmitting}
                />
              </div>

              {/* Fecha y hora */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <h2 className="font-semibold text-gray-900">¿Cuándo?</h2>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={multiDay}
                      onChange={e => {
                        setMultiDay(e.target.checked)
                        if (!e.target.checked) setEndDate('')
                      }}
                      className="rounded"
                    />
                    Varios días
                  </label>
                </div>

                {!multiDay ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha *</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="input-field" required disabled={isSubmitting} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Hora inicio</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                        className="input-field" disabled={isSubmitting} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Hora fin</label>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                        className="input-field" disabled={isSubmitting} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha inicio *</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                          className="input-field" required disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Fecha fin *</label>
                        <input type="date" value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          min={startDate}
                          className="input-field" required disabled={isSubmitting} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Hora inicio</label>
                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                          className="input-field" disabled={isSubmitting} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Hora fin</label>
                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                          className="input-field" disabled={isSubmitting} />
                      </div>
                    </div>
                    {startDate && endDate && startDate !== endDate && (
                      <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                        📆 {Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1)} días · del {new Date(startDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al {new Date(endDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                )}

                {startDate && (
                  <p className="text-xs text-gray-500 mt-2">
                    📅 {getDayLabel(startDate)} · {getTimeSlotLabel(parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]) || 0)}
                  </p>
                )}
              </div>

              {/* Hijos - solo si hay hijos registrados */}
              {numChildren > 0 && (
                <div className="card">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-orange-500" />
                    <h2 className="font-semibold text-gray-900">¿Con los niños?</h2>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setWithChildren(true)}
                      className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        withChildren ? 'border-orange-400 bg-orange-50 text-orange-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      👶 Sí, con {numChildren === 1 ? 'el niño/a' : `los ${numChildren} niños`}
                    </button>
                    <button type="button" onClick={() => setWithChildren(false)}
                      className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        !withChildren ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      🙋 No, sin niños
                    </button>
                  </div>
                  {withChildren && (
                    <p className="text-xs text-orange-600 mt-2">
                      ×{getChildrenMultiplier(numChildren).toFixed(1)} multiplicador — {numChildren} {numChildren === 1 ? 'hijo/a' : 'hijos'} a cargo
                    </p>
                  )}
                </div>
              )}

              {/* Compensación */}
              <div className="card">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="w-5 h-5 text-pink-500" />
                  <h2 className="font-semibold text-gray-900">Compensación</h2>
                  <span className="text-xs text-gray-400">(opcional)</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Ofrecer algo a cambio reduce los puntos que te cuestan esta actividad.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COMPENSATIONS.map(comp => (
                    <button key={comp.id} type="button" onClick={() => setCompensation(comp.id)}
                      className={`p-2.5 rounded-xl border-2 text-left text-sm transition-all ${
                        compensation === comp.id ? 'border-pink-400 bg-pink-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="font-medium text-gray-800 text-xs">{comp.label}</div>
                      {comp.discount > 0 && (
                        <div className="text-xs text-pink-600 mt-0.5">
                          Ahorra {(comp.discount * 100).toFixed(0)}% de puntos
                          {pointsCalc && <span className="ml-1 font-bold">(−{Math.round(pointsCalc.total * comp.discount / (1 - pointsCalc.compDiscount))} pts aprox.)</span>}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pb-8">
                <button type="button" onClick={onBack || (() => navigate('/dashboard'))}
                  className="btn-secondary flex-1" disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" disabled={!pointsCalc || !startDate || isSubmitting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? (
                    <><Loader className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    `Proponer a ${partnerName} →`
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT: Puntos */}
            <div className="lg:col-span-1">
              <div className="card sticky top-24">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Coste de la actividad
                </h3>

                {/* Explanation box */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
                  <p className="font-semibold mb-1">💰 ¿Cómo funciona?</p>
                  <p>Cada actividad <strong>te cuesta matripuntos</strong>. Las tareas del hogar te los <strong>devuelven</strong>. Si tu saldo baja de 0, estás "en deuda" con la pareja.</p>
                </div>

                {pointsCalc ? (
                  <>
                    <div className="text-center py-5 bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-xl mb-4">
                      <div className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1">Esta actividad te costará</div>
                      <div className="text-5xl font-black text-red-600">−{pointsCalc.total}</div>
                      <div className="text-sm text-gray-500 mt-1">MATRIPUNTOS</div>
                      {pointsCalc.numDays > 1 && (
                        <div className="text-xs text-purple-600 font-semibold mt-1">{pointsCalc.durationLabel}</div>
                      )}
                      {pointsCalc.compDiscount > 0 && (
                        <div className="text-xs text-pink-600 mt-1">Con compensación aplicada</div>
                      )}
                    </div>

                    <button type="button" onClick={() => setShowBreakdown(!showBreakdown)}
                      className="w-full flex items-center justify-between text-sm text-gray-600 mb-2 py-1">
                      <span>Ver cómo se calcula</span>
                      {showBreakdown ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {showBreakdown && (
                      <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5 font-mono mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Base {selectedCat?.emoji}</span>
                          <span className="font-bold">{selectedCat?.basePoints} pts</span>
                        </div>
                        {selectedSub && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ajuste subcategoría</span>
                            <span className={selectedSub.basePointsModifier >= 0 ? 'text-green-600' : 'text-red-500'}>
                              {selectedSub.basePointsModifier >= 0 ? '+' : ''}{selectedSub.basePointsModifier}
                            </span>
                          </div>
                        )}
                        {(selectedSub?.basePointsModifier ?? 0) !== 0 && (
                          <div className="flex justify-between border-t border-gray-200 pt-1">
                            <span className="text-gray-600">Subtotal base</span>
                            <span className="font-bold">{pointsCalc.effectiveBase} pts</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">× Hora ({pointsCalc.timeLabel})</span>
                          <span className={pointsCalc.timeMult > 1 ? 'text-orange-600 font-bold' : ''}>{pointsCalc.timeMult.toFixed(1)}×</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">× Día ({pointsCalc.dayMult > 1 ? 'fin semana' : 'entre semana'})</span>
                          <span className={pointsCalc.dayMult > 1 ? 'text-blue-600 font-bold' : ''}>{pointsCalc.dayMult.toFixed(1)}×</span>
                        </div>
                        {pointsCalc.numDays > 1 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">× Duración ({pointsCalc.numDays} días)</span>
                            <span className="text-purple-600 font-bold">{pointsCalc.durationMult.toFixed(1)}×</span>
                          </div>
                        )}
                        {withChildren && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">× Hijos ({numChildren || 1})</span>
                            <span className="text-orange-600 font-bold">{pointsCalc.childMult.toFixed(1)}×</span>
                          </div>
                        )}
                        {pointsCalc.compDiscount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">− Compensación</span>
                            <span className="text-pink-600">−{(pointsCalc.compDiscount * 100).toFixed(0)}%</span>
                          </div>
                        )}
                        <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold">
                          <span>= Coste total</span>
                          <span className="text-red-600">−{pointsCalc.total} pts</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-xs">
                      {pointsCalc.total >= 150 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700">
                          🔥 Impacto muy alto — tu pareja revisará con cuidado
                        </div>
                      )}
                      {pointsCalc.total >= 50 && pointsCalc.total < 150 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-orange-700">
                          ⚠️ Impacto moderado — ofrecer compensación ayuda
                        </div>
                      )}
                      {pointsCalc.total < 50 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-green-700">
                          ✅ Impacto bajo — fácil de aprobar
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">🎯</div>
                    <p className="text-sm">Selecciona una categoría y fecha para ver el coste</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
