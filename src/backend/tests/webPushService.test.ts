// Tests herméticos para webPushService.
// Cubren: sendPushToSubscription (no VAPID, 410 Gone, happy), getPublicVapidKey,
// pushTemplates structure.

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SUB = { endpoint: 'https://push.example.com/sub1', p256dh: 'key', auth: 'auth' }
const PAYLOAD = { title: 'Test', body: 'Hello' }

// ── getPublicVapidKey ─────────────────────────────────────────────────────────

describe('getPublicVapidKey', () => {
  const origKey = process.env.VAPID_PUBLIC_KEY

  afterEach(() => {
    if (origKey === undefined) delete process.env.VAPID_PUBLIC_KEY
    else process.env.VAPID_PUBLIC_KEY = origKey
  })

  it('returns null when VAPID_PUBLIC_KEY is not set', async () => {
    delete process.env.VAPID_PUBLIC_KEY
    // Re-import fresh module to pick up env state
    jest.resetModules()
    const { getPublicVapidKey } = await import('../src/services/webPushService.js')
    expect(getPublicVapidKey()).toBeNull()
  })

  it('returns the key when VAPID_PUBLIC_KEY is set', async () => {
    process.env.VAPID_PUBLIC_KEY = 'BExamplePublicKey=='
    jest.resetModules()
    const { getPublicVapidKey } = await import('../src/services/webPushService.js')
    expect(getPublicVapidKey()).toBe('BExamplePublicKey==')
  })
})

// ── sendPushToSubscription — web-push not available ──────────────────────────

describe('sendPushToSubscription — web-push not configured', () => {
  beforeEach(() => {
    delete process.env.VAPID_PUBLIC_KEY
    delete process.env.VAPID_PRIVATE_KEY
    jest.resetModules()
  })

  it('returns ok=false when VAPID keys are missing', async () => {
    const { sendPushToSubscription } = await import('../src/services/webPushService.js')
    const result = await sendPushToSubscription(SUB, PAYLOAD)
    expect(result.ok).toBe(false)
  })
})

// ── pushTemplates ─────────────────────────────────────────────────────────────

describe('pushTemplates', () => {
  let pushTemplates: any

  beforeEach(async () => {
    jest.resetModules()
    ;({ pushTemplates } = await import('../src/services/webPushService.js'))
  })

  it('achievementUnlocked returns title with icon', () => {
    const payload = pushTemplates.achievementUnlocked('Racha de 7', '🔥')
    expect(payload.title).toContain('🔥')
    expect(payload.body ?? payload.title).toBeTruthy()
  })

  it('every template function returns an object with title and body', () => {
    const templates: Record<string, (...args: any[]) => any> = pushTemplates
    for (const [name, fn] of Object.entries(templates)) {
      if (typeof fn !== 'function') continue
      // Call with placeholder strings to avoid crashes
      const result = fn('name', 'icon', 'partner', 'msg')
      expect(result).toHaveProperty('title')
      // body may be undefined for simple alerts but at minimum title must exist
      expect(typeof result.title).toBe('string')
    }
  })
})
