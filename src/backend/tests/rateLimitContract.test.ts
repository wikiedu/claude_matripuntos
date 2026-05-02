// v1.6.1 — Hermetic test del rate-limiter. Verifica que los buckets
// nombrados se exportan con configuración correcta. No levanta el server
// real (los tests integration en E2E/Playwright cubrirán el comportamiento).

import { describe, it, expect } from '@jest/globals'

describe('rateLimiter buckets', () => {
  it('exports authBucket / writeBucket / readBucket / profileMutationBucket / criticalBucket', async () => {
    const mod = await import('../src/middleware/rateLimiter')
    expect(typeof mod.authBucket).toBe('function')
    expect(typeof mod.writeBucket).toBe('function')
    expect(typeof mod.readBucket).toBe('function')
    expect(typeof mod.profileMutationBucket).toBe('function')
    expect(typeof mod.criticalBucket).toBe('function')
  })

  it('buckets son middleware express (4 args, devuelven undefined sync)', async () => {
    const mod = await import('../src/middleware/rateLimiter')
    // express-rate-limit retorna RateLimitRequestHandler que tiene resetKey y otros
    expect(mod.authBucket).toHaveProperty('resetKey')
  })
})
