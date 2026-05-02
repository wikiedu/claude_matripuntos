import { describe, it, expect } from 'vitest'
import { sanitizeProps } from './telemetry'

describe('telemetry sanitize', () => {
  it('strip blacklisted keys (email, password, name, surname...)', () => {
    const r = sanitizeProps({
      moodKey: 'feliz',
      email: 'me@x.com',
      password: 'p',
      name: 'Edu',
      surname: 'Calderon',
      secretKey: 'abc',
      joinCode: 'XYZ',
    })
    expect(r.moodKey).toBe('feliz')
    expect(r.email).toBeUndefined()
    expect(r.password).toBeUndefined()
    expect(r.name).toBeUndefined()
    expect(r.surname).toBeUndefined()
    expect(r.secretKey).toBeUndefined()
    expect(r.joinCode).toBeUndefined()
  })

  it('preserva keys safe', () => {
    const r = sanitizeProps({
      moodKey: 'tranquilo',
      source: 'header',
      response: 'accepted',
      round: 2,
    })
    expect(r).toEqual({
      moodKey: 'tranquilo',
      source: 'header',
      response: 'accepted',
      round: 2,
    })
  })

  it('handles undefined input', () => {
    expect(sanitizeProps()).toEqual({})
  })
})
