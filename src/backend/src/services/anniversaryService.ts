/**
 * v2.0.5 — Anniversary timer.
 *
 * Devuelve un breakdown years/months/days entre `relationshipStartDate` y hoy.
 * PURE: no toca BD, recibe la fecha como input. Caller pre-loads.
 */

export interface AnniversaryBreakdown {
  startDate: string         // ISO
  totalDays: number
  years: number
  months: number
  days: number
  label: string             // "3 años, 4 meses y 12 días"
  nextMilestoneDays: number // días hasta el próximo aniversario anual
  nextMilestoneLabel: string
}

const ANNIVERSARY_MS = 1000 * 60 * 60 * 24
const ROUND_MILESTONES_YEARS = [1, 5, 10, 15, 20, 25, 30, 40, 50]

export function computeAnniversary(startDate: Date, now: Date = new Date()): AnniversaryBreakdown | null {
  if (!startDate || isNaN(startDate.getTime())) return null
  if (startDate.getTime() > now.getTime()) {
    // Fecha en el futuro: tratamos como "0 días", invitando a corregirla.
    return null
  }

  const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()))
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  let years = today.getUTCFullYear() - start.getUTCFullYear()
  let months = today.getUTCMonth() - start.getUTCMonth()
  let days = today.getUTCDate() - start.getUTCDate()

  if (days < 0) {
    months--
    // Días en el mes anterior al actual
    const prevMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0))
    days += prevMonth.getUTCDate()
  }
  if (months < 0) {
    years--
    months += 12
  }

  const totalDays = Math.floor((today.getTime() - start.getTime()) / ANNIVERSARY_MS)

  // Siguiente aniversario anual
  const nextAnniversary = new Date(Date.UTC(today.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
  if (nextAnniversary.getTime() <= today.getTime()) {
    nextAnniversary.setUTCFullYear(nextAnniversary.getUTCFullYear() + 1)
  }
  const nextMilestoneDays = Math.ceil((nextAnniversary.getTime() - today.getTime()) / ANNIVERSARY_MS)

  const nextYears = years + (months === 0 && days === 0 ? 0 : 1)
  const isRound = ROUND_MILESTONES_YEARS.includes(nextYears)
  const nextMilestoneLabel = isRound
    ? `🎉 ¡${nextYears} años en ${nextMilestoneDays} días!`
    : `${nextYears}º aniversario en ${nextMilestoneDays} días`

  const parts: string[] = []
  if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`)
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`)
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`)
  const label = parts.length > 1
    ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
    : parts[0]

  return {
    startDate: start.toISOString(),
    totalDays,
    years,
    months,
    days,
    label,
    nextMilestoneDays,
    nextMilestoneLabel,
  }
}
