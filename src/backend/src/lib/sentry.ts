// Sentry wiring for the backend. Disabled when SENTRY_DSN is not set so
// local dev and PR previews stay silent. Call initSentry() before building
// the express app, then mount the request/error handlers exactly where
// @sentry/node expects them.

import * as Sentry from '@sentry/node'
import type { Express } from 'express'

let ready = false

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release:
      process.env.APP_VERSION ??
      process.env.RENDER_GIT_COMMIT ??
      process.env.COMMIT_SHA ??
      undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
  })
  ready = true
}

export function mountSentryRequestHandler(app: Express): void {
  if (!ready) return
  app.use(Sentry.Handlers.requestHandler())
}

export function mountSentryErrorHandler(app: Express): void {
  if (!ready) return
  app.use(Sentry.Handlers.errorHandler())
}

export function captureException(err: unknown): void {
  if (!ready) return
  Sentry.captureException(err)
}
