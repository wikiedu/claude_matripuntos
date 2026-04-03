/**
 * Motor de cálculo de Matripuntos
 * Basado en: TABLA_PUNTOS.md
 */

export interface PointsConfig {
  numChildren: 0 | 1 | 2 | 3
  activityType: 'necesaria' | 'salud' | 'ocio' | 'alto_impacto'
  timeSlot: 'manana' | 'dia' | 'tarde' | 'noche' | 'madrugada'
  duration: number // en horas
}

export interface ActivityPoints {
  basePts: number
  factorType: number
  factorTimeSlot: number
  factorDuration: number
  factorChildren: number
  subtotal: number
  compensation?: {
    type: string
    discount: number // porcentaje en decimal (0.1 = 10%)
  }
  total: number
  breakdown: string[]
}

// Base points por tipo de actividad (tabla de TABLA_PUNTOS.md)
const ACTIVITY_BASE_POINTS: Record<string, number> = {
  cena: 8,
  desayuno: 2.5,
  viaje_fin_semana: 25,
  despedida: 20,
  maraton: 9,
  viaje_trabajo: 40,
  deporte: 2.5,
  medico: 1.5,
  compra: 3,
  cena_familia: 0, // Sin puntos
}

// Multiplicadores
const FACTOR_ACTIVITY_TYPE: Record<string, number> = {
  necesaria: 0.7,  // -30%
  salud: 0.85,     // -15%
  ocio: 1.0,       // base
  alto_impacto: 1.2, // +20%
}

const FACTOR_TIME_SLOT: Record<string, number> = {
  manana: 1.4,     // 07:00 - 09:30
  dia: 1.0,        // 09:30 - 17:30
  tarde: 1.5,      // 17:30 - 21:30
  noche: 1.2,      // 21:30 - 01:00
  madrugada: 1.6,  // 01:00 - 07:00
}

const FACTOR_DURATION: Record<string, number> = {
  'corta': 1.0,    // 0-3h
  'media': 1.1,    // 3-8h
  'larga': 1.25,   // 8-24h
  'muy_larga': 1.35, // 24+h
}

const FACTOR_CHILDREN: Record<number, number> = {
  0: 1.0,
  1: 1.4,
  2: 1.8,
  3: 2.2,
}

// Compensaciones disponibles
export const COMPENSATIONS = [
  { id: 'none', label: 'Ninguna', discount: 0 },
  { id: 'cocina', label: 'Cocina hecha', discount: 0.1 },
  { id: 'levantarse', label: 'Yo me levanto mañana', discount: 0.2 },
  { id: 'canguro', label: 'Contratar canguro 2h', discount: 0.15 },
]

/**
 * Determina la franja horaria basada en la hora de inicio
 * 07:00-09:30 → manana (×1.4)
 * 09:30-17:30 → dia (×1.0)
 * 17:30-21:30 → tarde (×1.5)
 * 21:30-01:00 → noche (×1.2)
 * 01:00-07:00 → madrugada (×1.6)
 */
export function getTimeSlot(hour: number, minute: number = 0): string {
  const totalMinutes = hour * 60 + minute
  if (totalMinutes >= 7*60 && totalMinutes < 9*60+30) return 'manana'
  if (totalMinutes >= 9*60+30 && totalMinutes < 17*60+30) return 'dia'
  if (totalMinutes >= 17*60+30 && totalMinutes < 21*60+30) return 'tarde'
  if (totalMinutes >= 21*60+30 || totalMinutes < 1*60) return 'noche'
  return 'madrugada'
}

/**
 * Determina el rango de duración
 */
export function getDurationCategory(hours: number): string {
  if (hours <= 3) return 'corta'
  if (hours <= 8) return 'media'
  if (hours <= 24) return 'larga'
  return 'muy_larga'
}

/**
 * Redondea a múltiplos de 0.5
 */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2
}

/**
 * Calcula los puntos de una actividad
 */
export function calculateActivityPoints(
  activityType: string,
  startHour: number,
  durationHours: number,
  config: PointsConfig,
  compensationId?: string,
  startMinute: number = 0
): ActivityPoints {
  const breakdown: string[] = []

  // 1. Base points
  const basePts = ACTIVITY_BASE_POINTS[activityType] || 5
  breakdown.push(`Base (tabla: ${activityType}) = ${basePts} pts`)

  // 2. Factor tipo de actividad
  const factorType = FACTOR_ACTIVITY_TYPE[config.activityType] || 1.0
  breakdown.push(`× Factor tipo (${config.activityType}) = ×${factorType}`)

  // 3. Factor franja horaria
  const timeSlot = getTimeSlot(startHour, startMinute)
  const factorTimeSlot = FACTOR_TIME_SLOT[timeSlot] || 1.0
  breakdown.push(`× Factor franja (${timeSlot}) = ×${factorTimeSlot}`)

  // 4. Factor duración
  const durationCategory = getDurationCategory(durationHours)
  const factorDuration = FACTOR_DURATION[durationCategory] || 1.0
  breakdown.push(`× Factor duración (${durationHours}h) = ×${factorDuration}`)

  // 5. Factor hijos
  const factorChildren = FACTOR_CHILDREN[config.numChildren] || 1.0
  breakdown.push(`× Factor hijos (${config.numChildren}) = ×${factorChildren}`)

  // Subtotal
  const subtotal = basePts * factorType * factorTimeSlot * factorDuration * factorChildren
  breakdown.push(`────────────────────────────────`)
  breakdown.push(`SUBTOTAL = ${subtotal.toFixed(2)} pts`)

  // 6. Compensación
  let total = subtotal
  const compensation = compensationId && compensationId !== 'none'
    ? COMPENSATIONS.find(c => c.id === compensationId)
    : null

  if (compensation && compensation.discount > 0) {
    const discountAmount = subtotal * compensation.discount
    total = subtotal - discountAmount
    breakdown.push(``)
    breakdown.push(`Compensación: ${compensation.label} (-${(compensation.discount * 100).toFixed(0)}%)`)
    breakdown.push(`= -${discountAmount.toFixed(2)} pts`)
    breakdown.push(`────────────────────────────────`)
  }

  // Redondear a 0.5
  const finalTotal = roundToHalf(total)

  return {
    basePts,
    factorType,
    factorTimeSlot,
    factorDuration,
    factorChildren,
    subtotal: roundToHalf(subtotal),
    compensation: compensation && compensation.discount > 0 ? {
      type: compensation.id,
      discount: compensation.discount,
    } : undefined,
    total: finalTotal,
    breakdown,
  }
}

/**
 * Calcula puntos de una tarea diaria
 */
export function calculateTaskPoints(
  taskType: string,
  modifier?: 'normal' | 'profunda' | 'visita' | 'complicada'
): number {
  const basePoints: Record<string, number> = {
    cocina: 2.0,
    baños: 1.5,
    limpieza: 1.5,
    compra: 1.0,
    logistica: 1.0,
    cuidado: 1.5,
  }

  const modifierValues: Record<string, number> = {
    normal: 0,
    profunda: 1.0,
    visita: 0.5,
    complicada: 1.0,
  }

  const base = basePoints[taskType] || 1.0
  const modValue = modifier ? modifierValues[modifier] || 0 : 0

  return roundToHalf(base + modValue)
}

/**
 * Calcula balance entre dos usuarios
 */
export function calculateBalance(transactions: number[]): number {
  return roundToHalf(transactions.reduce((sum, val) => sum + val, 0))
}

/**
 * Determina color basado en balance
 */
export function getBalanceColor(balance: number): 'success' | 'warning' | 'danger' {
  if (balance > 10) return 'success'
  if (balance < -10) return 'danger'
  return 'warning'
}

/**
 * Describe un balance en palabras
 */
export function describeBalance(balance: number): string {
  if (balance > 0) return `+${balance} pts (a favor)`
  if (balance < 0) return `${balance} pts (en contra)`
  return '0 pts (equilibrio)'
}
