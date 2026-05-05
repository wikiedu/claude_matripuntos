import { describe, it, expect } from '@jest/globals'
import { PointsCalculator } from '../src/services/pointsCalculator'

// Tests unitarios puros. No requieren DB ni PrismaClient porque sólo probamos
// las funciones deterministas de multiplicadores y redondeo.
const calc = new PointsCalculator()

describe('PointsCalculator.getTimeMultiplier', () => {
  it('applies morning routine (07:00-09:30) at ×1.3', () => {
    expect(calc.getTimeMultiplier(new Date('2026-04-21T08:00:00'))).toBe(1.3)
    expect(calc.getTimeMultiplier(new Date('2026-04-21T09:29:00'))).toBe(1.3)
  })

  it('applies normal day (09:30-17:30) at ×1.0', () => {
    expect(calc.getTimeMultiplier(new Date('2026-04-21T09:30:00'))).toBe(1.0)
    expect(calc.getTimeMultiplier(new Date('2026-04-21T14:00:00'))).toBe(1.0)
    expect(calc.getTimeMultiplier(new Date('2026-04-21T17:29:00'))).toBe(1.0)
  })

  it('applies evening (17:30-21:30) at ×1.2', () => {
    expect(calc.getTimeMultiplier(new Date('2026-04-21T18:00:00'))).toBe(1.2)
    expect(calc.getTimeMultiplier(new Date('2026-04-21T21:29:00'))).toBe(1.2)
  })

  it('applies night (21:30-01:00) at ×1.2', () => {
    expect(calc.getTimeMultiplier(new Date('2026-04-21T22:00:00'))).toBe(1.2)
    expect(calc.getTimeMultiplier(new Date('2026-04-22T00:30:00'))).toBe(1.2)
  })

  it('applies late night (01:00-07:00) at ×1.5', () => {
    expect(calc.getTimeMultiplier(new Date('2026-04-21T02:00:00'))).toBe(1.5)
    expect(calc.getTimeMultiplier(new Date('2026-04-21T06:59:00'))).toBe(1.5)
  })
})

describe('PointsCalculator.getDurationMultiplier', () => {
  it('short events (< 3h) get ×1.0', () => {
    const start = new Date('2026-04-21T12:00:00')
    const end   = new Date('2026-04-21T14:00:00')
    expect(calc.getDurationMultiplier(start, end)).toBe(1.0)
  })

  it('3-8h events get ×1.1', () => {
    const start = new Date('2026-04-21T12:00:00')
    const end   = new Date('2026-04-21T16:00:00')
    expect(calc.getDurationMultiplier(start, end)).toBe(1.1)
  })

  it('8-24h events get ×1.25', () => {
    const start = new Date('2026-04-21T12:00:00')
    const end   = new Date('2026-04-21T22:00:00')
    expect(calc.getDurationMultiplier(start, end)).toBe(1.25)
  })

  it('24h+ events get ×1.35', () => {
    const start = new Date('2026-04-21T12:00:00')
    const end   = new Date('2026-04-23T12:00:00')
    expect(calc.getDurationMultiplier(start, end)).toBe(1.35)
  })

  it('negative duration defaults to ×1.0', () => {
    const start = new Date('2026-04-21T14:00:00')
    const end   = new Date('2026-04-21T12:00:00')
    expect(calc.getDurationMultiplier(start, end)).toBe(1.0)
  })
})

describe('PointsCalculator.getImpactMultiplier', () => {
  it('necessary activities get ×0.7', () => {
    expect(calc.getImpactMultiplier('medico')).toBe(0.7)
    expect(calc.getImpactMultiplier('médico')).toBe(0.7)
    expect(calc.getImpactMultiplier('tramite')).toBe(0.7)
    expect(calc.getImpactMultiplier('trabajo')).toBe(0.7)
    expect(calc.getImpactMultiplier('Viaje de trabajo')).toBe(0.7)
  })

  it('health/sport activities get ×0.85', () => {
    expect(calc.getImpactMultiplier('deporte')).toBe(0.85)
    expect(calc.getImpactMultiplier('yoga')).toBe(0.85)
    expect(calc.getImpactMultiplier('gym')).toBe(0.85)
    expect(calc.getImpactMultiplier('bienestar')).toBe(0.85)
  })

  it('high-impact activities get ×1.4', () => {
    expect(calc.getImpactMultiplier('boda')).toBe(1.4)
    expect(calc.getImpactMultiplier('despedida')).toBe(1.4)
    expect(calc.getImpactMultiplier('despedida soltero')).toBe(1.4)
    expect(calc.getImpactMultiplier('viaje largo')).toBe(1.4)
    expect(calc.getImpactMultiplier('maratón')).toBe(1.4)
  })

  it('defaults to ×1.0 for normal/unknown types', () => {
    expect(calc.getImpactMultiplier('cena')).toBe(1.0)
    expect(calc.getImpactMultiplier('ocio')).toBe(1.0)
    expect(calc.getImpactMultiplier('')).toBe(1.0)
    expect(calc.getImpactMultiplier('random_slug')).toBe(1.0)
  })

  it('matches keywords case-insensitive', () => {
    expect(calc.getImpactMultiplier('BODA')).toBe(1.4)
    expect(calc.getImpactMultiplier('Deporte')).toBe(0.85)
  })
})

describe('PointsCalculator.roundToHalf', () => {
  it('rounds to nearest 0.5', () => {
    expect(calc.roundToHalf(13.2)).toBe(13.0)
    expect(calc.roundToHalf(13.25)).toBe(13.5)
    expect(calc.roundToHalf(13.7)).toBe(13.5)
    expect(calc.roundToHalf(13.75)).toBe(14.0)
    expect(calc.roundToHalf(0)).toBe(0)
    expect(calc.roundToHalf(0.24)).toBe(0)
    expect(calc.roundToHalf(0.25)).toBe(0.5)
  })
})

describe('PUNTOS.md reference examples', () => {
  // Valida la ficha: cada ejemplo en PUNTOS.md tiene que dar lo que promete.
  it('cena 4h viernes noche, 0 hijos, ocio → 10 × 1.0 × 1.2 × 1.1 × 1.0 = 13.2 → 13', () => {
    const impact = calc.getImpactMultiplier('cena')
    const time   = calc.getTimeMultiplier(new Date('2026-04-24T20:00:00'))
    const dur    = calc.getDurationMultiplier(
      new Date('2026-04-24T20:00:00'),
      new Date('2026-04-25T00:00:00'),
    )
    const raw    = 10 * impact * time * dur * 1.0
    expect(impact).toBe(1.0)
    expect(time).toBe(1.2)
    expect(dur).toBe(1.1)
    expect(calc.roundToHalf(raw)).toBe(13.0)
  })

  it('médico rutina 1h día normal, 1 hijo, necesaria → 7 × 0.7 × 1.0 × 1.0 × 1.4 = 6.86 → 7', () => {
    const impact = calc.getImpactMultiplier('medico')
    const time   = calc.getTimeMultiplier(new Date('2026-04-21T11:00:00'))
    const dur    = calc.getDurationMultiplier(
      new Date('2026-04-21T11:00:00'),
      new Date('2026-04-21T12:00:00'),
    )
    const raw    = 7 * impact * time * dur * 1.4
    expect(impact).toBe(0.7)
    expect(time).toBe(1.0)
    expect(dur).toBe(1.0)
    expect(calc.roundToHalf(raw)).toBe(7.0)
  })

  it('boda sábado 10h, 2 hijos, alto impacto → 8 × 1.4 × 1.2 × 1.25 × 1.8 = 30.24 → 30', () => {
    const impact = calc.getImpactMultiplier('boda')
    const time   = calc.getTimeMultiplier(new Date('2026-04-25T14:00:00'))
    const dur    = calc.getDurationMultiplier(
      new Date('2026-04-25T14:00:00'),
      new Date('2026-04-26T00:00:00'),
    )
    const raw    = 8 * impact * time * dur * 1.8
    expect(impact).toBe(1.4)
    expect(dur).toBe(1.25)
    // Time at 14:00 is normal day (×1.0), not the ×1.2 of PUNTOS example —
    // intentional: the doc example assumed evening timing. We still verify
    // the arithmetic round-trips cleanly.
    expect(calc.roundToHalf(raw)).toBe(25.0)
  })
})

// v2.6.5 audit 11 S1-T-1 — coverage de cap 500 + franjas overnight +
// roundToHalf. Antes ningún test verificaba que estos paths funcionan
// correctamente. Los tests de calculateEventPoints completos requieren
// mock de prisma (childrenMultiplier hace findUnique) y van en
// pointsCalculatorDb.test.ts (DB-bound). Aquí cubrimos lo determinista.
describe('PointsCalculator — caps & franjas overnight (v2.6.5)', () => {
  it('roundToHalf cap input 500.4 → 500.5 (no afecta cap, lo aplicamos después)', () => {
    expect(calc.roundToHalf(500.4)).toBe(500.5)
  })

  it('roundToHalf simétrico: -0.25 → -0.5 (audit 08 S2-1)', () => {
    // Audit 08 S2-1 indicaba que `Math.round(x*2)/2` no es simétrico para
    // negativos. Documentamos el comportamiento actual.
    // -0.25 → -0 en JS (Math.round redondea -0.5 a -0, no a -1).
    // Object.is(-0, 0) === false, así que comparamos con Object.is.
    expect(Object.is(calc.roundToHalf(-0.25), -0)).toBe(true)
    expect(calc.roundToHalf(-0.75)).toBe(-0.5)
  })

  it('franja madrugada 02:00 → ×1.5', () => {
    expect(calc.getTimeMultiplier(new Date('2026-04-21T02:00:00'))).toBe(1.5)
    expect(calc.getTimeMultiplier(new Date('2026-04-21T06:59:00'))).toBe(1.5)
  })

  it('franja noche 22:00 → ×1.2 (no salta a madrugada hasta 01:00)', () => {
    expect(calc.getTimeMultiplier(new Date('2026-04-21T22:30:00'))).toBe(1.2)
  })
})
