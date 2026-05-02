// v1.6.1 — Rate-limiting granular por endpoint + por user authenticado.
// Buckets nombrados (decisión brainstorm 7-B):
//  - authBucket: 10/min IP (login/register/joinCode)
//  - profileMutationBucket: 30/min user (PUT /profile/me)
//  - writeBucket: 60/min user (POST events/tasks/etc)
//  - readBucket: 200/min user (GET *)
//  - criticalBucket: 3/hora user (account-delete, couple-leave)
//
// Storage: memoria en proceso (Render single-instance). Multi-instancia → Redis,
// diferido (ver docs/legal/scaling-notes.md).

import rateLimit from 'express-rate-limit'
import type { Request, Response, NextFunction } from 'express'

const keyByUserOrIp = (req: Request) => (req as any).user?.id ?? req.ip

const messageFor = (bucket: string): { error: string } => {
  if (bucket === 'auth') return { error: 'Demasiados intentos, prueba en un minuto' }
  if (bucket === 'critical') return { error: 'Esta acción tiene un límite de 3 por hora por seguridad' }
  return { error: 'Demasiadas peticiones, prueba en un minuto' }
}

const handlerFor = (bucket: string) =>
  (req: Request, res: Response, _next: NextFunction, opts: any) => {
    // Telemetría server-side (cargada lazy para evitar ciclos).
    import('../services/telemetry.js')
      .then(m => m.telemetryBackend?.track?.((req as any).user?.id ?? 'anon', 'ratelimit.hit', { endpoint: req.path, bucket }))
      .catch(() => {})
    res.status(opts.statusCode ?? 429).json(messageFor(bucket))
  }

export const authBucket = rateLimit({
  windowMs: 60_000, max: 10, keyGenerator: req => req.ip ?? 'unknown',
  handler: handlerFor('auth'),
  standardHeaders: true,
  legacyHeaders: false,
})

export const profileMutationBucket = rateLimit({
  windowMs: 60_000, max: 30, keyGenerator: keyByUserOrIp,
  handler: handlerFor('profile'),
  standardHeaders: true,
})

export const writeBucket = rateLimit({
  windowMs: 60_000, max: 60, keyGenerator: keyByUserOrIp,
  handler: handlerFor('write'),
  standardHeaders: true,
})

export const readBucket = rateLimit({
  windowMs: 60_000, max: 200, keyGenerator: keyByUserOrIp,
  handler: handlerFor('read'),
  standardHeaders: true,
})

export const criticalBucket = rateLimit({
  windowMs: 3_600_000, max: 3, keyGenerator: keyByUserOrIp,
  handler: handlerFor('critical'),
  standardHeaders: true,
})
