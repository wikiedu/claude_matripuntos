// RequestActivity page — v2 dark design (Task 7.4 of v1.4 La Evolución).
// 3-step wizard: (1) Tipo/categoría · (2) Fecha/duración/franja · (3) Puntos + compensación.
// Preserves all business logic from the v1 version — only JSX/styling changes.

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Check, Loader, ChevronDown, ChevronRight,
  Clock, Calendar, Tag, MessageSquare, Gift, Users,
} from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { Button } from '../components/v2/primitives/Button'
import { Pill } from '../components/v2/primitives/Pill'
import { Card } from '../components/v2/primitives/Card'
import { ActivityCatalogPicker } from '../components/v2/catalog/ActivityCatalogPicker'
import type { ActivityTemplate } from '../hooks/useActivityCatalog'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subcategory {
  id: string
  name: string
  basePointsModifier: number
}

interface Category {
  id: string
  name: string
  emoji: string
  type: string
  basePoints: number
  description?: string
  subcategories?: Subcategory[]
}

// Audit v1.4 P0-B: these helpers mirror src/backend/src/services/pointsCalculator.ts
// ONLY for live UI preview. The canonical numbers live on the backend; the
// created event's pointsCalculated always comes from there. If backend changes,
// update here so the preview matches, or (better) drive this via a debounced
// call to /api/points/preview. The weekend ×1.2 factor was removed — CLAUDE.md
// states "No hay factor día de semana". Duration is now measured in hours,
// not days, to match the backend brackets.
function getTimeMultiplier(hour: number, minute = 0): number {
  const totalMinutes = hour * 60 + minute
  if (totalMinutes >= 7 * 60 && totalMinutes < 9 * 60 + 30) return 1.3   // 07:00-09:30
  if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 17 * 60 + 30) return 1.0 // 09:30-17:30
  if (totalMinutes >= 17 * 60 + 30 && totalMinutes < 21 * 60 + 30) return 1.2 // 17:30-21:30
  if (totalMinutes >= 21 * 60 + 30 || totalMinutes < 1 * 60) return 1.2   // 21:30-01:00
  return 1.5 // 01:00-07:00
}

function getTimeSlotLabel(hour: number, minute = 0): string {
  const totalMinutes = hour * 60 + minute
  if (totalMinutes >= 7 * 60 && totalMinutes < 9 * 60 + 30) return 'Mañana temprano ×1.3'
  if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 17 * 60 + 30) return 'Horario normal ×1.0'
  if (totalMinutes >= 17 * 60 + 30 && totalMinutes < 21 * 60 + 30) return 'Tarde/cena ×1.2'
  if (totalMinutes >= 21 * 60 + 30 || totalMinutes < 1 * 60) return 'Noche ×1.2'
  return 'Madrugada ×1.5'
}

function getChildrenMultiplier(n: number): number {
  if (n <= 0) return 1.0
  if (n === 1) return 1.4
  if (n === 2) return 1.8
  return 2.2
}

function getDurationMultiplier(hours: number): number {
  if (hours < 3) return 1.0
  if (hours < 8) return 1.1
  if (hours < 24) return 1.25
  return 1.35
}

function getDurationLabel(hours: number): string {
  if (hours < 3) return ''
  const mult = getDurationMultiplier(hours)
  const h = Math.round(hours)
  return `${h}h ×${mult.toFixed(2)}`
}

function calcPoints(
  base: number, subMod: number, timeMult: number,
  childMult: number, compDiscount: number, durationMult = 1.0,
): number {
  const effectiveBase = Math.max(1, base + subMod)
  const raw = effectiveBase * timeMult * childMult * durationMult * (1 - compDiscount)
  return Math.min(500, Math.max(0, Math.round(raw * 2) / 2))
}

// ─── Static data ──────────────────────────────────────────────────────────────
const COMPENSATIONS = [
  { id: 'none', label: 'Sin compensación', discount: 0 },
  { id: 'cocinar', label: '🍳 Cocinar la cena de la semana', discount: 0.15 },
  { id: 'tareas', label: '🧹 Tareas extra esa semana', discount: 0.20 },
  { id: 'masaje', label: '💆 Masaje de espalda', discount: 0.10 },
  { id: 'desayuno', label: '☕ Desayuno en cama', discount: 0.10 },
  { id: 'noche_libre', label: '🌙 Noche libre para tu pareja', discount: 0.25 },
]

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'salida', name: 'Salida (amigos/social)', emoji: '🍻', type: 'event', basePoints: 8, subcategories: [
    { id: 's1', name: 'Noche de fiesta / copas', basePointsModifier: 3 },
    { id: 's2', name: 'Cena con amigos', basePointsModifier: 1 },
    { id: 's3', name: 'Afterwork / vermut', basePointsModifier: 0 },
    { id: 's4', name: 'Reunión familiar', basePointsModifier: -2 },
  ]},
  { id: 'evento', name: 'Evento especial', emoji: '🎉', type: 'event', basePoints: 12, subcategories: [
    { id: 's5', name: 'Boda / comunión', basePointsModifier: 5 },
    { id: 's6', name: 'Despedida de soltero/a', basePointsModifier: 4 },
    { id: 's7', name: 'Concierto / festival', basePointsModifier: 2 },
    { id: 's8', name: 'Cumpleaños / celebración', basePointsModifier: 0 },
    { id: 's9', name: 'Teatro / ópera / cine', basePointsModifier: -2 },
  ]},
  { id: 'viaje', name: 'Viaje', emoji: '✈️', type: 'event', basePoints: 10, subcategories: [
    { id: 's10', name: 'Viaje personal / amigos', basePointsModifier: 3 },
    { id: 's11', name: 'Viaje de trabajo', basePointsModifier: -3 },
    { id: 's12', name: 'Día fuera', basePointsModifier: -4 },
  ]},
  { id: 'escapada', name: 'Escapada en pareja', emoji: '💑', type: 'event', basePoints: 6, subcategories: [
    { id: 's13', name: 'Fin de semana romántico', basePointsModifier: 2 },
    { id: 's14', name: 'Escapada con amigos (juntos)', basePointsModifier: 0 },
    { id: 's15', name: 'Día de excursión', basePointsModifier: -2 },
  ]},
  { id: 'deporte', name: 'Deporte / hobby', emoji: '🏃', type: 'event', basePoints: 4, subcategories: [
    { id: 's16', name: 'Deporte de equipo / partido', basePointsModifier: 2 },
    { id: 's17', name: 'Hobby personal', basePointsModifier: 1 },
    { id: 's18', name: 'Gym / yoga / running', basePointsModifier: -1 },
    { id: 's19', name: 'Spa / bienestar', basePointsModifier: 2 },
  ]},
  { id: 'trabajo', name: 'Trabajo / formación', emoji: '💼', type: 'event', basePoints: 5, subcategories: [
    { id: 's20', name: 'Overtime / reunión fuera', basePointsModifier: 2 },
    { id: 's21', name: 'Curso / formación', basePointsModifier: 0 },
    { id: 's22', name: 'Comida de trabajo', basePointsModifier: -1 },
  ]},
  { id: 'salud', name: 'Salud / médico', emoji: '🏥', type: 'event', basePoints: 3, subcategories: [
    { id: 's23', name: 'Urgencias / hospital', basePointsModifier: 1 },
    { id: 's24', name: 'Consulta médica', basePointsModifier: 0 },
    { id: 's25', name: 'Farmacia / gestión médica', basePointsModifier: -1 },
  ]},
  { id: 'tramite', name: 'Trámite / gestión', emoji: '📋', type: 'event', basePoints: 3, subcategories: [
    { id: 's26', name: 'Banco / notaría', basePointsModifier: 1 },
    { id: 's27', name: 'Administración / papelería', basePointsModifier: 0 },
    { id: 's28', name: 'Recado rápido', basePointsModifier: -1 },
  ]},
  { id: 'otro', name: 'Otro', emoji: '📌', type: 'event', basePoints: 5, subcategories: [] },
]

// ─── Stepper header ───────────────────────────────────────────────────────────
function StepperHeader({ step, onJump }: { step: 1 | 2 | 3; onJump: (s: 1 | 2 | 3) => void }) {
  const steps: Array<{ n: 1 | 2 | 3; label: string }> = [
    { n: 1, label: 'Tipo' },
    { n: 2, label: 'Cuándo' },
    { n: 3, label: 'Puntos' },
  ]
  return (
    <div className="flex items-center gap-2 mb-4">
      {steps.map((s, i) => {
        const active = s.n === step
        const done = s.n < step
        return (
          <div key={s.n} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJump(s.n)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                active
                  ? 'bg-grad-cta text-white shadow-md shadow-brand-amber/30'
                  : done
                    ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/30'
                    : 'bg-surface-card text-text-tertiary border border-brd-subtle'
              }`}
            >
              <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
                active ? 'bg-white/20' : done ? 'bg-brand-purple/30' : 'bg-surface-muted'
              }`}>
                {done ? <Check className="w-3 h-3" /> : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <span className="w-4 h-px bg-brd-subtle" aria-hidden />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RequestActivity({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate()
  const { user, couple } = useAppStore()

  const [step, setStep] = useState<1 | 2 | 3>(1)

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

  // v2.0.6 — picker del catálogo de actividades
  const [showCatalog, setShowCatalog] = useState(false)
  const handleCatalogSelect = (tpl: ActivityTemplate) => {
    // Prefill ligero: título + descripción + duración. La categoría/puntos se
    // calculan a partir de las Category de la pareja (no del template directamente)
    // — mapeamos por nombre cuando coincide para acelerar el wizard.
    if (tpl.name && !title) setTitle(tpl.name)
    if (tpl.description && !description) setDescription(tpl.description)

    const cat = categories.find(
      (c) => c.name.toLowerCase() === tpl.category.toLowerCase()
        || c.name.toLowerCase().includes(tpl.category.toLowerCase()),
    )
    if (cat) setSelectedCategoryId(cat.id)

    if (tpl.defaultDurationMinutes && tpl.defaultDurationMinutes > 0 && startDate && !endDate) {
      const start = new Date(`${startDate}T${startTime || '20:00'}`)
      const end = new Date(start.getTime() + tpl.defaultDurationMinutes * 60_000)
      const pad = (n: number) => String(n).padStart(2, '0')
      setEndDate(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`)
      setEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`)
    }

    setShowCatalog(false)
  }

  const numChildren = useMemo(() => couple?.children?.length ?? 0, [couple])
  const partnerName = couple?.users?.find((u) => u.id !== user?.id)?.name || 'tu pareja'

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingCats(true)
        const res = await apiClient.categories.getAll()
        const cats = (res.categories || res || []).filter((c: Category) => c.type === 'event')
        const hasSubcategories = cats.some((c: Category) => c.subcategories && c.subcategories.length > 0)
        if (cats.length > 0 && hasSubcategories) {
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

  const selectedCat = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId),
    [categories, selectedCategoryId],
  )
  const selectedSub = useMemo(
    () => selectedCat?.subcategories?.find((s) => s.id === selectedSubcategoryId),
    [selectedCat, selectedSubcategoryId],
  )

  const numDays = useMemo(() => {
    if (!multiDay || !startDate || !endDate) return 1
    const diff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    return Math.max(1, Math.round(diff) + 1)
  }, [multiDay, startDate, endDate])

  // Duration in hours — matches backend pointsCalculator.getDurationMultiplier().
  const durationHours = useMemo(() => {
    if (!startDate || !startTime) return 0
    const startISO = `${startDate}T${startTime}:00`
    const endDateActual = multiDay && endDate ? endDate : startDate
    const endISO = `${endDateActual}T${endTime || startTime}:00`
    let ms = new Date(endISO).getTime() - new Date(startISO).getTime()
    if (!multiDay && ms <= 0) ms += 24 * 60 * 60 * 1000
    return Math.max(0, ms / (1000 * 60 * 60))
  }, [multiDay, startDate, endDate, startTime, endTime])

  const pointsCalc = useMemo(() => {
    if (!selectedCat || !startDate || !startTime) return null

    const [hourStr, minuteStr] = startTime.split(':')
    const hour = parseInt(hourStr)
    const minute = parseInt(minuteStr) || 0
    const timeMult = getTimeMultiplier(hour, minute)
    const childMult = withChildren ? getChildrenMultiplier(numChildren || 1) : 1.0
    const compDiscount = COMPENSATIONS.find((c) => c.id === compensation)?.discount ?? 0
    const subMod = Number(selectedSub?.basePointsModifier ?? 0)
    const durationMult = getDurationMultiplier(durationHours)
    const total = calcPoints(Number(selectedCat.basePoints), subMod, timeMult, childMult, compDiscount, durationMult)

    return {
      basePoints: Number(selectedCat.basePoints),
      subMod,
      effectiveBase: Math.max(1, Number(selectedCat.basePoints) + subMod),
      timeMult, childMult, compDiscount, durationMult, durationHours, numDays, total,
      timeLabel: getTimeSlotLabel(hour, minute),
      durationLabel: getDurationLabel(durationHours),
    }
  }, [selectedCat, selectedSub, startDate, startTime, withChildren, numChildren, compensation, numDays, durationHours])

  const previewSubPts = (subMod: number) => {
    if (!selectedCat || !startDate || !startTime) return null
    const [hourStr2, minuteStr2] = startTime.split(':')
    const hour = parseInt(hourStr2)
    const minute = parseInt(minuteStr2) || 0
    const timeMult = getTimeMultiplier(hour, minute)
    const childMult = withChildren ? getChildrenMultiplier(numChildren || 1) : 1.0
    const compDiscount = COMPENSATIONS.find((c) => c.id === compensation)?.discount ?? 0
    const durationMult = getDurationMultiplier(durationHours)
    return calcPoints(Number(selectedCat.basePoints), Number(subMod), timeMult, childMult, compDiscount, durationMult)
  }

  const handleCategoryChange = (id: string) => {
    setSelectedCategoryId(id)
    setSelectedSubcategoryId('')
  }

  const canAdvanceFromStep1 = !!selectedCategoryId
  const canAdvanceFromStep2 = !!startDate && (!multiDay || !!endDate)

  const handleJump = (target: 1 | 2 | 3) => {
    if (target === 1) return setStep(1)
    if (target === 2) {
      if (!canAdvanceFromStep1) { setSubmitError('Selecciona una categoría primero'); return }
      setSubmitError(null)
      return setStep(2)
    }
    if (target === 3) {
      if (!canAdvanceFromStep1) { setSubmitError('Selecciona una categoría primero'); return }
      if (!canAdvanceFromStep2) { setSubmitError('Indica la fecha de inicio'); return }
      setSubmitError(null)
      return setStep(3)
    }
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
      if (!multiDay && dateEnd <= dateStart) {
        dateEnd.setDate(dateEnd.getDate() + 1)
      }

      // Audit v1.4 P0-B: send the RAW effective base points (category base +
      // subcategory modifier). The backend re-applies time/duration/children
      // multipliers via pointsCalculator.calculateEventPoints(). Sending the
      // precomputed total used to double-multiply.
      const eventResponse = await apiClient.events.create({
        type: selectedCat!.name.toLowerCase().replace(/\s+/g, '_').replace(/&/g, 'y').replace(/[^a-z0-9_]/g, ''),
        title: title || `${selectedCat!.emoji} ${selectedSub?.name || selectedCat!.name}`,
        description,
        dateStart: dateStart.toISOString(),
        dateEnd: dateEnd.toISOString(),
        hasChildren: withChildren,
        numChildren: withChildren ? (numChildren || 1) : 0,
        pointsBase: pointsCalc.effectiveBase,
        compensation: compensation !== 'none' ? compensation : undefined,
        compensationDiscount: 1 - pointsCalc.compDiscount,
      })

      const eventId = eventResponse.event?.id || eventResponse.id
      // Propose the computed total — the partner sees the full multiplied
      // value as the opening bid. Backend stores this in `lastProposedPoints`
      // and doesn't re-multiply.
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

  // ─── Success state ─────────────────────────────────────────────────────────
  if (submitSuccess) {
    return (
      <main className="px-4 pt-10 pb-6">
        <Card padding="lg" elevated className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-extrabold text-text-primary mb-2">¡Solicitud Enviada!</h2>
          <p className="text-text-secondary mb-4">
            Tu solicitud ha sido enviada a <strong className="text-text-primary">{partnerName}</strong> para que la revise.
          </p>
          <p className="text-sm text-text-tertiary">Redirigiendo al dashboard…</p>
        </Card>
      </main>
    )
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <main className="px-4 pt-3 pb-6">
      {/* Title row with back chevron */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onBack || (() => navigate('/dashboard'))}
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm font-semibold"
          aria-label="Volver"
        >
          <ChevronLeft size={18} />
          <span>Solicitar actividad</span>
        </button>
        <Pill tone="amber">Paso {step} de 3</Pill>
      </div>
      <p className="text-sm text-text-tertiary mb-4">
        Propone un plan a <strong className="text-text-primary">{partnerName}</strong>
      </p>

      <StepperHeader step={step} onJump={handleJump} />

      {submitError && (
        <div className="mb-3 p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ───── STEP 1: Tipo / categoría ───── */}
        {step === 1 && (
          <>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-brand-purple" />
                  <h2 className="font-semibold text-text-primary">Tipo de actividad</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCatalog(true)}
                  className="text-xs px-2.5 py-1 rounded-md bg-brand-purple/15 text-brand-purple hover:bg-brand-purple/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
                >
                  🔎 Catálogo
                </button>
              </div>
              {showCatalog && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                  <ActivityCatalogPicker
                    onSelect={handleCatalogSelect}
                    onClose={() => setShowCatalog(false)}
                  />
                </div>
              )}
              {isLoadingCats ? (
                <div className="flex items-center gap-2 text-text-tertiary py-4">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Cargando categorías…</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {categories.map((cat) => {
                      const active = selectedCategoryId === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryChange(cat.id)}
                          className={`p-3 rounded-md text-left transition ${
                            active
                              ? 'bg-brand-purple/15 border border-brand-purple/50'
                              : 'bg-surface-card border border-brd-subtle hover:border-brd-purple'
                          }`}
                        >
                          <div className="text-2xl mb-1">{cat.emoji}</div>
                          <div className="text-xs font-semibold text-text-primary leading-tight">{cat.name}</div>
                          <div className="text-[11px] text-text-tertiary mt-0.5">{cat.basePoints} pts base</div>
                        </button>
                      )
                    })}
                  </div>

                  {selectedCat?.subcategories && selectedCat.subcategories.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-text-secondary mb-2">¿Qué tipo concretamente?</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedCat.subcategories.map((sub) => {
                          const preview = previewSubPts(Number(sub.basePointsModifier))
                          const isSelected = selectedSubcategoryId === sub.id
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() =>
                                setSelectedSubcategoryId(sub.id === selectedSubcategoryId ? '' : sub.id)
                              }
                              className={`p-2.5 rounded-md text-left text-sm transition flex items-center justify-between ${
                                isSelected
                                  ? 'bg-brand-purple/15 border border-brand-purple/50 text-text-primary'
                                  : 'bg-surface-card border border-brd-subtle text-text-secondary hover:border-brd-purple'
                              }`}
                            >
                              <span>{sub.name}</span>
                              <span className={`text-xs font-bold ml-2 flex-shrink-0 ${
                                isSelected ? 'text-brand-purple' : 'text-text-tertiary'
                              }`}>
                                {preview !== null && startDate
                                  ? `${preview} pts`
                                  : `${Math.max(1, Number(selectedCat!.basePoints) + Number(sub.basePointsModifier))} pts`}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      {!startDate && (
                        <p className="text-xs text-text-tertiary mt-2">
                          Selecciona una fecha en el paso 2 para ver los puntos exactos de cada opción.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Descripción opcional en el paso 1 para que acompañe al título */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-brand-indigo" />
                <h2 className="font-semibold text-text-primary">Descripción</h2>
                <span className="text-xs text-text-tertiary">(opcional)</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={selectedCat ? `Ej: ${selectedCat.emoji} ${selectedSub?.name || selectedCat.name}` : 'Título del plan'}
                className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 mb-3"
                disabled={isSubmitting}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="¿Por qué quieres hacer esto? Justifica a tu pareja el motivo…"
                className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 h-20 resize-none"
                disabled={isSubmitting}
              />
            </Card>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={onBack || (() => navigate('/dashboard'))}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                fullWidth
                disabled={!canAdvanceFromStep1}
                onClick={() => handleJump(2)}
              >
                Siguiente: fecha
              </Button>
            </div>
          </>
        )}

        {/* ───── STEP 2: Fecha / duración / franja / hijos ───── */}
        {step === 2 && (
          <>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-success" />
                  <h2 className="font-semibold text-text-primary">¿Cuándo?</h2>
                </div>
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiDay}
                    onChange={(e) => {
                      setMultiDay(e.target.checked)
                      if (!e.target.checked) setEndDate('')
                    }}
                    className="rounded accent-brand-purple"
                  />
                  Varios días
                </label>
              </div>

              {!multiDay ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block">Fecha *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 [color-scheme:dark]"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block">Hora inicio</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 [color-scheme:dark]"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block">Hora fin</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 [color-scheme:dark]"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">Fecha inicio *</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 [color-scheme:dark]"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">Fecha fin *</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 [color-scheme:dark]"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">Hora inicio</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 [color-scheme:dark]"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">Hora fin</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 [color-scheme:dark]"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  {startDate && endDate && startDate !== endDate && (
                    <div className="text-xs text-success bg-success/10 border border-success/30 rounded-md px-3 py-2">
                      {Math.round(
                        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1,
                      )}{' '}
                      días · del{' '}
                      {new Date(startDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}{' '}
                      al{' '}
                      {new Date(endDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>
              )}

              {startDate && (
                <p className="text-xs text-text-tertiary mt-3">
                  {getTimeSlotLabel(
                    parseInt(startTime.split(':')[0]),
                    parseInt(startTime.split(':')[1]) || 0,
                  )}
                </p>
              )}
            </Card>

            {/* Hijos */}
            {numChildren > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-brand-amber" />
                  <h2 className="font-semibold text-text-primary">¿Con los niños?</h2>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setWithChildren(true)}
                    className={`flex-1 p-3 rounded-md text-sm font-medium transition ${
                      withChildren
                        ? 'bg-brand-amber/15 border border-brand-amber/50 text-brand-amber'
                        : 'bg-surface-card border border-brd-subtle text-text-secondary hover:border-brd-purple'
                    }`}
                  >
                    👶 Sí, con {numChildren === 1 ? 'el niño/a' : `los ${numChildren} niños`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithChildren(false)}
                    className={`flex-1 p-3 rounded-md text-sm font-medium transition ${
                      !withChildren
                        ? 'bg-brand-indigo/15 border border-brand-indigo/50 text-indigo-300'
                        : 'bg-surface-card border border-brd-subtle text-text-secondary hover:border-brd-purple'
                    }`}
                  >
                    🙋 No, sin niños
                  </button>
                </div>
                {withChildren && (
                  <p className="text-xs text-brand-amber mt-2">
                    ×{getChildrenMultiplier(numChildren).toFixed(1)} multiplicador — {numChildren}{' '}
                    {numChildren === 1 ? 'hijo/a' : 'hijos'} a cargo
                  </p>
                )}
              </Card>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" fullWidth onClick={() => setStep(1)} disabled={isSubmitting}>
                Atrás
              </Button>
              <Button
                type="button"
                fullWidth
                disabled={!canAdvanceFromStep2}
                onClick={() => handleJump(3)}
              >
                Siguiente: puntos
              </Button>
            </div>
          </>
        )}

        {/* ───── STEP 3: Puntos + compensación ───── */}
        {step === 3 && (
          <>
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-brand-purple" />
                <h3 className="font-bold text-text-primary">Coste de la actividad</h3>
              </div>

              <div className="bg-brand-amber/10 border border-brand-amber/30 rounded-md p-3 mb-4 text-xs text-brand-amber">
                <p className="font-semibold mb-1">¿Cómo funciona?</p>
                <p className="text-text-secondary">
                  Cada actividad <strong className="text-text-primary">te cuesta matripuntos</strong>. Las tareas del hogar te los{' '}
                  <strong className="text-text-primary">devuelven</strong>. Si tu saldo baja de 0, estás "en deuda" con la pareja.
                </p>
              </div>

              {pointsCalc ? (
                <>
                  <div className="text-center py-5 bg-grad-hero rounded-md mb-4">
                    <div className="text-[11px] font-bold text-white/70 uppercase tracking-wide mb-1">
                      Esta actividad te costará
                    </div>
                    <div className="text-5xl font-black text-white">−{pointsCalc.total}</div>
                    <div className="text-sm text-white/80 mt-1">MATRIPUNTOS</div>
                    {pointsCalc.numDays > 1 && (
                      <div className="text-xs text-white/80 font-semibold mt-1">{pointsCalc.durationLabel}</div>
                    )}
                    {pointsCalc.compDiscount > 0 && (
                      <div className="text-xs text-white/80 mt-1">Con compensación aplicada</div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="w-full flex items-center justify-between text-sm text-text-secondary hover:text-text-primary mb-2 py-1"
                  >
                    <span>Ver cómo se calcula</span>
                    {showBreakdown ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {showBreakdown && (
                    <div className="bg-surface-muted border border-brd-subtle rounded-md p-3 text-xs space-y-1.5 font-mono mb-4 text-text-secondary">
                      <div className="flex justify-between">
                        <span>Base {selectedCat?.emoji}</span>
                        <span className="font-bold text-text-primary">{selectedCat?.basePoints} pts</span>
                      </div>
                      {selectedSub && (
                        <div className="flex justify-between">
                          <span>Ajuste subcategoría</span>
                          <span className={Number(selectedSub.basePointsModifier) >= 0 ? 'text-success' : 'text-danger'}>
                            {Number(selectedSub.basePointsModifier) >= 0 ? '+' : ''}
                            {Number(selectedSub.basePointsModifier)}
                          </span>
                        </div>
                      )}
                      {Number(selectedSub?.basePointsModifier ?? 0) !== 0 && (
                        <div className="flex justify-between border-t border-brd-subtle pt-1">
                          <span>Subtotal base</span>
                          <span className="font-bold text-text-primary">{pointsCalc.effectiveBase} pts</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>× Hora ({pointsCalc.timeLabel})</span>
                        <span className={pointsCalc.timeMult > 1 ? 'text-brand-amber font-bold' : 'text-text-primary'}>
                          {pointsCalc.timeMult.toFixed(1)}×
                        </span>
                      </div>
                      {pointsCalc.durationMult > 1 && (
                        <div className="flex justify-between">
                          <span>× Duración ({Math.round(pointsCalc.durationHours)}h)</span>
                          <span className="text-brand-purple font-bold">{pointsCalc.durationMult.toFixed(1)}×</span>
                        </div>
                      )}
                      {withChildren && (
                        <div className="flex justify-between">
                          <span>× Hijos ({numChildren || 1})</span>
                          <span className="text-brand-amber font-bold">{pointsCalc.childMult.toFixed(1)}×</span>
                        </div>
                      )}
                      {pointsCalc.compDiscount > 0 && (
                        <div className="flex justify-between">
                          <span>− Compensación</span>
                          <span className="text-success">−{(pointsCalc.compDiscount * 100).toFixed(0)}%</span>
                        </div>
                      )}
                      <div className="border-t border-brd-subtle pt-1.5 flex justify-between font-bold">
                        <span className="text-text-primary">= Coste total</span>
                        <span className="text-brand-amber">−{pointsCalc.total} pts</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 text-xs">
                    {pointsCalc.total >= 150 && (
                      <div className="bg-danger/10 border border-danger/30 rounded-md p-2 text-danger">
                        Impacto muy alto — tu pareja revisará con cuidado.
                      </div>
                    )}
                    {pointsCalc.total >= 50 && pointsCalc.total < 150 && (
                      <div className="bg-warn/10 border border-warn/30 rounded-md p-2 text-warn">
                        Impacto moderado — ofrecer compensación ayuda.
                      </div>
                    )}
                    {pointsCalc.total < 50 && (
                      <div className="bg-success/10 border border-success/30 rounded-md p-2 text-success">
                        Impacto bajo — fácil de aprobar.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-text-tertiary">
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="text-sm">Completa los pasos anteriores para ver el coste</p>
                </div>
              )}
            </Card>

            {/* Compensación */}
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-5 h-5 text-brand-purple" />
                <h2 className="font-semibold text-text-primary">Compensación</h2>
                <span className="text-xs text-text-tertiary">(opcional)</span>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                Ofrecer algo a cambio reduce los puntos que te cuestan esta actividad.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMPENSATIONS.map((comp) => {
                  const active = compensation === comp.id
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => setCompensation(comp.id)}
                      className={`p-2.5 rounded-md text-left text-sm transition ${
                        active
                          ? 'bg-brand-purple/15 border border-brand-purple/50 text-text-primary'
                          : 'bg-surface-card border border-brd-subtle text-text-secondary hover:border-brd-purple'
                      }`}
                    >
                      <div className="font-medium text-xs">{comp.label}</div>
                      {comp.discount > 0 && (
                        <div className="text-xs text-brand-purple mt-0.5">
                          Ahorra {(comp.discount * 100).toFixed(0)}% de puntos
                          {pointsCalc && (
                            <span className="ml-1 font-bold">
                              (−{Math.round((pointsCalc.total * comp.discount) / (1 - pointsCalc.compDiscount))} pts aprox.)
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>

            <div className="flex gap-3 pt-2 pb-4">
              <Button type="button" variant="outline" fullWidth onClick={() => setStep(2)} disabled={isSubmitting}>
                Atrás
              </Button>
              <Button
                type="submit"
                fullWidth
                disabled={!pointsCalc || !startDate || isSubmitting}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Enviando…
                  </span>
                ) : (
                  <>Enviar a {partnerName}</>
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </main>
  )
}
