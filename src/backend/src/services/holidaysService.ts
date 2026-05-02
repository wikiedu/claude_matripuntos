// v2.0.1 — Holidays loader. JSON estático por (country, year). Se actualiza
// anualmente vía workflow GitHub bot (out-of-scope ahora — manual).

// Hardcoded inline para evitar bullshit de import attributes / fs paths
// que difieren entre ts-jest ESM y vite/tsc en runtime. Es ~10 entries,
// se actualiza una vez al año via PR del bot.
const EMBEDDED_ES_2026: { holidays: Holiday[] } = {
  holidays: [
    { date: '2026-01-01', title: 'Año Nuevo' },
    { date: '2026-01-06', title: 'Reyes' },
    { date: '2026-04-03', title: 'Viernes Santo' },
    { date: '2026-05-01', title: 'Día del Trabajo' },
    { date: '2026-08-15', title: 'Asunción de la Virgen' },
    { date: '2026-10-12', title: 'Fiesta Nacional de España' },
    { date: '2026-11-01', title: 'Todos los Santos' },
    { date: '2026-12-06', title: 'Día de la Constitución' },
    { date: '2026-12-08', title: 'Inmaculada Concepción' },
    { date: '2026-12-25', title: 'Navidad' },
  ],
}

export interface Holiday {
  date: string  // ISO date YYYY-MM-DD
  title: string
}

function getRegistry(): Record<string, Record<number, { holidays: Holiday[] }>> {
  return {
    es: { 2026: EMBEDDED_ES_2026 },
  }
}

export function loadHolidays(year: number, country: string = 'es'): Holiday[] {
  const c = country.toLowerCase()
  return getRegistry()[c]?.[year]?.holidays ?? []
}

export interface HolidayDraft {
  type: 'holiday'
  title: string
  date: Date
  allDay: true
  externalSource: 'auto'
}

export function deriveHolidayEntries(year: number, country: string = 'es'): HolidayDraft[] {
  return loadHolidays(year, country).map(h => ({
    type: 'holiday' as const,
    title: h.title,
    date: new Date(`${h.date}T00:00:00Z`),
    allDay: true as const,
    externalSource: 'auto' as const,
  }))
}
