import { describe, it, expect, beforeEach } from 'vitest'
import { readConsent, writeConsent, clearConsent, CONSENT_COOKIE_NAME } from './consent'

beforeEach(() => { clearConsent() })

describe('consent service', () => {
  it('readConsent returns null cuando no hay cookie', () => {
    expect(readConsent()).toBeNull()
  })

  it('writeConsent + readConsent roundtrip — analytics true', () => {
    writeConsent({ analytics: true })
    const r = readConsent()
    expect(r?.analytics).toBe(true)
    expect(r?.version).toBe(1)
    expect(r?.acceptedAt).toBeTruthy()
  })

  it('writeConsent analytics:false persiste correctamente', () => {
    writeConsent({ analytics: false })
    expect(readConsent()?.analytics).toBe(false)
  })

  it('clearConsent borra la cookie', () => {
    writeConsent({ analytics: true })
    clearConsent()
    expect(readConsent()).toBeNull()
  })

  it('cookie con version distinto se ignora', () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ analytics: true, version: 99 }))}; path=/`
    expect(readConsent()).toBeNull()
  })
})
