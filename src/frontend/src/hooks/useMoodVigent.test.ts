import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMoodVigent } from './useMoodVigent'

describe('useMoodVigent', () => {
  it('returns null when moodKey is null', () => {
    const { result } = renderHook(() => useMoodVigent(null, null))
    expect(result.current).toBeNull()
  })

  it('returns null when moodKey is empty string', () => {
    const { result } = renderHook(() => useMoodVigent('', new Date().toISOString()))
    expect(result.current).toBeNull()
  })

  it('returns null when moodUpdatedAt missing', () => {
    const { result } = renderHook(() => useMoodVigent('feliz', null))
    expect(result.current).toBeNull()
  })

  // v2.0.7 — el contrato es "vigente solo si moodUpdatedAt es HOY (día local)".
  // ANTES este test usaba "hace 12h", que cruza medianoche si la suite corre
  // antes de las 12:00 → flaky. Usamos `new Date()` (ahora) que siempre es hoy.
  it('returns mood when updated today', () => {
    const recent = new Date().toISOString()
    const { result } = renderHook(() => useMoodVigent('feliz', recent))
    expect(result.current?.key).toBe('feliz')
    expect(result.current?.emoji).toBe('😊')
  })

  it('returns null when updated on a previous day', () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    const { result } = renderHook(() => useMoodVigent('feliz', old))
    expect(result.current).toBeNull()
  })

  it('returns null for unknown mood key', () => {
    const recent = new Date().toISOString()
    const { result } = renderHook(() => useMoodVigent('unknown_mood', recent))
    expect(result.current).toBeNull()
  })

  it('accepts Date object for moodUpdatedAt', () => {
    const { result } = renderHook(() => useMoodVigent('cansado', new Date()))
    expect(result.current?.key).toBe('cansado')
  })
})
