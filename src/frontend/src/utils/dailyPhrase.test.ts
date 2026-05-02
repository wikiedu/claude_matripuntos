import { describe, it, expect } from 'vitest'
import { pickPhraseCategory, getDailyPhrase, type PhraseState } from './dailyPhrase'

const baseState: PhraseState = {
  coupleId: 'c1',
  dayKey: '2026-05-02',
  hasOpenDisputeRecent: false,
  streakBrokenLast24h: false,
  recentMilestone: false,
  weekendDay: false,
  heavyWeekDetected: false,
  partnerHighContribLastWeek: false,
  isMonday: false,
}

describe('pickPhraseCategory — cascada por urgencia emocional', () => {
  it('disputa abierta gana sobre todo lo demás', () => {
    expect(pickPhraseCategory({
      ...baseState, hasOpenDisputeRecent: true, weekendDay: true, recentMilestone: true,
    })).toBe('reconciliacion')
  })

  it('racha rota si no hay disputa', () => {
    expect(pickPhraseCategory({ ...baseState, streakBrokenLast24h: true })).toBe('animo')
  })

  it('hito si no hay disputa ni racha rota', () => {
    expect(pickPhraseCategory({ ...baseState, recentMilestone: true, weekendDay: true })).toBe('hito')
  })

  it('weekend cuando no hay nada urgente arriba', () => {
    expect(pickPhraseCategory({ ...baseState, weekendDay: true })).toBe('celebrar')
  })

  it('semana cargada después de weekend', () => {
    expect(pickPhraseCategory({ ...baseState, heavyWeekDetected: true })).toBe('calma')
  })

  it('partner con alto aporte', () => {
    expect(pickPhraseCategory({ ...baseState, partnerHighContribLastWeek: true })).toBe('agradecer')
  })

  it('lunes cuando no hay nada antes', () => {
    expect(pickPhraseCategory({ ...baseState, isMonday: true })).toBe('animo-suave')
  })

  it('fallback neutra-positivo cuando no hay señal', () => {
    expect(pickPhraseCategory(baseState)).toBe('neutra-positivo')
  })
})

describe('getDailyPhrase — determinismo y consistencia', () => {
  it('mismo state → misma frase exacta', () => {
    const a = getDailyPhrase(baseState)
    const b = getDailyPhrase(baseState)
    expect(a.id).toBe(b.id)
    expect(a.text).toBe(b.text)
  })

  it('coupleId distinto mantiene categoría pero puede dar otra frase', () => {
    const a = getDailyPhrase(baseState)
    const b = getDailyPhrase({ ...baseState, coupleId: 'c2' })
    expect(a.category).toBe(b.category)
  })

  it('dayKey distinto mantiene categoría pero suele dar otra frase', () => {
    const a = getDailyPhrase(baseState)
    const b = getDailyPhrase({ ...baseState, dayKey: '2026-05-03' })
    expect(a.category).toBe(b.category)
  })

  it('cambio de categoría → frase de la nueva categoría', () => {
    const neutral = getDailyPhrase(baseState)
    const weekend = getDailyPhrase({ ...baseState, weekendDay: true })
    expect(neutral.category).toBe('neutra-positivo')
    expect(weekend.category).toBe('celebrar')
  })

  it('always returns a phrase from PHRASES', () => {
    const r = getDailyPhrase(baseState)
    expect(r.id).toBeTruthy()
    expect(r.text).toBeTruthy()
  })
})
