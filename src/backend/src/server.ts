import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import {
  initSentry,
  mountSentryRequestHandler,
  mountSentryErrorHandler,
} from './lib/sentry.js'
import { logger } from './lib/logger.js'
import authRoutes from './routes/authRoutes.js'
import eventRoutes from './routes/eventRoutes.js'
import taskRoutes from './routes/taskRoutes.js'
import negotiationRoutes from './routes/negotiationRoutes.js'
import pointsRoutes from './routes/pointsRoutes.js'
import configurationRoutes from './routes/configurationRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import profileRoutes from './routes/profile.js'
import familyRoutes from './routes/family.js'
import categoryRoutes from './routes/categories.js'
import pointsV2Routes from './routes/pointsV2.js'
import achievementRoutes from './routes/achievements.js'
import gamificationRoutes from './routes/gamification.js'
import calendarRoutes from './routes/calendar.js'
import analyticsRoutes from './routes/analytics.js'
import activityRoutes from './routes/activityRoutes.js'
import invitationRoutes from './routes/invitations.js'
import ruleProposalRoutes from './routes/ruleProposals.js'
import shoppingRoutes from './routes/shopping.js'
import todoRoutes from './routes/todos.js'
import premiumRoutes from './routes/premium.js'
// v1.6.1
import accountRoutes from './routes/account.js'
import coupleLifecycleRoutes from './routes/couple.js'
import historyRoutes from './routes/history.js'
import profileCompletionRoutes from './routes/profileCompletion.js'
// v2.0.4 + v2.0.5 — antes eran dynamic import, lo que provocaba race en
// cold-start: el 404 handler quedaba registrado antes y devolvía "Route not
// found" para /api/anniversary, /api/activity-templates, etc. Ahora estáticos.
// v2.1.0 — gamificationV2 sigue activo para /streak, /challenge, /replay y /level
// (este último ahora consulta el sistema unificado de 10 niveles).
import gamificationV2Routes from './routes/gamificationV2.js'
import notificationsPushRoutes from './routes/notificationsPush.js'
import calendarV2Routes from './routes/calendarV2.js'
import googleCalendarOauthRoutes from './routes/googleCalendarOauth.js'
import journalRoutes from './routes/journal.js'
import analyticsV2Routes from './routes/analyticsV2.js'
import activityTemplatesRoutes from './routes/activityTemplates.js'
import configurationProposalsRoutes from './routes/configurationProposals.js'
import anniversaryRoutes from './routes/anniversary.js'
import taskProofRoutes from './routes/taskProof.js'
import { runRetention } from './jobs/dataRetentionJob.js'
import { authBucket as v161AuthBucket, writeBucket, readBucket } from './middleware/rateLimiter.js'
import cron from 'node-cron'
import { runWeeklyGeneration } from './services/recurringTaskService.js'
import { sendWeeklyDigests } from './services/digestService.js'
import { resetFreezersOnMonday, updateDailyStreak, calculateAndSaveXP } from './services/gamificationService.js'
import { checkAllAchievements } from './services/achievementCheckService.js'
import prisma from './lib/prisma.js'

dotenv.config()

// v2.7.4 audit 10 S1-I-5 — env validation al boot. Antes el server
// arrancaba con DATABASE_URL/JWT_SECRET faltantes y fallaba en la
// primera request con un error opaco. Aquí hacemos fail-fast con un
// mensaje legible para que un misconfig en Render se diagnostique
// inmediatamente desde los logs.
function validateEnv(): void {
  const required = ['JWT_SECRET', 'DATABASE_URL']
  const missing = required.filter((k) => !process.env[k] || process.env[k] === '')
  if (missing.length > 0) {
    logger.fatal({ missing }, '[boot] env vars requeridas no definidas')
    process.exit(1)
  }
  // JWT_SECRET tiene mínimo 32 chars (defensivo).
  if ((process.env.JWT_SECRET ?? '').length < 32) {
    logger.fatal('[boot] JWT_SECRET debe tener al menos 32 caracteres')
    process.exit(1)
  }
  // En production exigimos NODE_ENV explícito (S0-R-4 audit pre-v1.7).
  if (process.env.RENDER && process.env.NODE_ENV !== 'production') {
    logger.warn('[boot] corriendo en Render sin NODE_ENV=production. Algunas defensas relajan reglas (delete-account code en respuesta, etc).')
  }
}
validateEnv()

// v2.8.0 audit 02 S2-11 — log de estado del legacy achievement engine.
// Cuando el frontend deje de leer /api/achievements (V1), se podrá
// setear LEGACY_ACHIEVEMENTS_ENABLED=false y este log lo confirmará.
if (process.env.LEGACY_ACHIEVEMENTS_ENABLED === 'false') {
  logger.info('[boot] legacy V1 achievementEngine OFF — solo V2 (CoupleAchievement) activo.')
} else {
  logger.info('[boot] legacy V1 achievementEngine activo (en paralelo a V2). Set LEGACY_ACHIEVEMENTS_ENABLED=false para apagarlo cuando el frontend migre.')
}

initSentry()

const app = express()
const PORT = process.env.PORT || 3000

// Fase 1 (harness E2E): en tests importamos `app` con supertest. No queremos que
// el import arranque el listener ni registre cron jobs (timers en segundo plano
// que tocarían la DB a mitad de un test). Solo se activan fuera de NODE_ENV=test.
const RUN_BACKGROUND_JOBS = process.env.NODE_ENV !== 'test'

// Sentry request handler must run before any other middleware/routes so
// every request is traced. No-op when SENTRY_DSN is missing.
mountSentryRequestHandler(app)

// Middleware
// v2.7.3 audit 04 S2-7 — soporte multi-origin via CSV (preview/staging).
// FRONTEND_URLS (plural) es la nueva canónica; FRONTEND_URL (singular)
// se mantiene por compatibilidad para no romper deploys existentes.
const allowedOrigins = (() => {
  const csv = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? ''
  const parsed = csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parsed.length > 0) return parsed
  return ['http://localhost:5173', 'http://localhost:4173']
})()

// Audit v1.4 security hardening: helmet adds HSTS, X-Content-Type-Options,
// Referrer-Policy, XSS filter, etc. We disable `contentSecurityPolicy`
// because the API doesn't serve HTML — the frontend is on a different
// origin and sets its own CSP. CrossOriginResourcePolicy is relaxed to
// 'cross-origin' so the frontend can fetch across domains.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later' },
  skip: () => process.env.NODE_ENV === 'test', // Fase 1: sin rate-limit en E2E
  standardHeaders: true,
  legacyHeaders: false,
})

// Audit v1.4 security hardening: reset endpoints are destructive — throttle
// harder than auth (5 per hour per IP). Covers both reset-request and the
// reset-confirm handlers that live under /api/points.
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiadas solicitudes de reseteo. Inténtalo en 1 hora.' },
  skip: () => process.env.NODE_ENV === 'test', // Fase 1: sin rate-limit en E2E
  standardHeaders: true,
  legacyHeaders: false,
})

// Health check — v1.5 enriched with version/commit/uptime so we can verify
// which build is actually running in production (previously opaque).
const BOOT_TIME = Date.now()
const APP_VERSION =
  process.env.APP_VERSION ??
  process.env.npm_package_version ??
  'unknown'
const COMMIT_SHA =
  process.env.COMMIT_SHA ??
  process.env.GIT_COMMIT ??
  process.env.RENDER_GIT_COMMIT ??
  null

app.get('/api/health', async (req, res) => {
  let lastMigration: string | null = null
  let db: 'ok' | 'error' = 'ok'
  try {
    const row = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
      `SELECT migration_name FROM "_prisma_migrations"
       WHERE finished_at IS NOT NULL
       ORDER BY finished_at DESC
       LIMIT 1`,
    )
    lastMigration = row?.[0]?.migration_name ?? null
  } catch {
    db = 'error'
  }

  res.json({
    status: db === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    commit: COMMIT_SHA ? COMMIT_SHA.slice(0, 7) : null,
    uptimeSeconds: Math.floor((Date.now() - BOOT_TIME) / 1000),
    db,
    lastMigration,
    env: process.env.NODE_ENV ?? 'development',
  })
})

// Routes
// v1.6.1 — Aplicamos authBucket nuevo además del authLimiter legacy.
// Composición: ambos en cadena, el más restrictivo (authBucket: 10/min IP) gana.
// Cuando confiemos en el nuevo, el legacy puede retirarse en sesión próxima.
app.use('/api/auth', authLimiter, v161AuthBucket, authRoutes)
app.use('/api/events', writeBucket, eventRoutes)
app.use('/api/tasks', writeBucket, taskRoutes)
app.use('/api/negotiations', negotiationRoutes)
app.use('/api/points/reset-request', resetLimiter)
app.use('/api/points/reset-confirm', resetLimiter)
app.use('/api/points', pointsRoutes)
app.use('/api/configuration', configurationRoutes)
app.use('/api/notifications', notificationRoutes)

// V2 Routes
app.use('/api/profile', profileRoutes)
app.use('/api', familyRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/points', pointsV2Routes)
// T3 — retiradas las rutas V2 de negociación (routes/negotiation.ts, Sunset
// vencido): el frontend usa la API canónica V1 /api/negotiations.

// Gamification Routes (FASE 4)
app.use('/api/achievements', achievementRoutes)
app.use('/api/gamification', gamificationRoutes)

// v1.7 — Gamification v2 (feature-flagged)
app.use('/api/gamification-v2', gamificationV2Routes)
app.use('/api/notifications/push', notificationsPushRoutes)

// v2.0.1 — Calendario 360 (feature-flagged CALENDAR_360_ENABLED)
app.use('/api/calendar/v2', calendarV2Routes)
app.use('/api/calendar/google', googleCalendarOauthRoutes)

// v2.0.2 — Journaling (feature-flagged JOURNAL_ENABLED, default ON)
app.use('/api/journal', journalRoutes)

// v2.0.3 — Analytics Pro (feature-flagged ANALYTICS_V2_ENABLED, default ON)
app.use('/api/analytics/v2', analyticsV2Routes)

// v2.0.4 — Activity catalog (feature-flagged CATALOG_ENABLED, default ON)
app.use('/api/activity-templates', activityTemplatesRoutes)

// v2.0.4 — Configuration consensus proposals (feature-flagged CONFIG_PROPOSALS_ENABLED, default ON)
app.use('/api/config-proposals', configurationProposalsRoutes)

// v2.0.5 — Anniversary timer (feature-flagged ANNIVERSARY_ENABLED, default ON)
app.use('/api/anniversary', anniversaryRoutes)

// v2.0.5 — Task proof image (feature-flagged TASK_PROOF_ENABLED, default ON)
app.use('/api/task-logs', taskProofRoutes)

// Calendar Routes (FASE 5)
app.use('/api/calendar', calendarRoutes)

// Analytics Routes (FASE 6)
app.use('/api/analytics', analyticsRoutes)

// Activity Routes
app.use('/api/recent-activity', activityRoutes)

// Invitation + partner linking routes
app.use('/api/auth', invitationRoutes)

// Rule Proposals Routes
app.use('/api/rules', ruleProposalRoutes)

// v1.3 Routes
app.use('/api/shopping', shoppingRoutes)
app.use('/api/todos', todoRoutes)

// v1.4 Routes
app.use('/api/premium', premiumRoutes)

// v1.6.1 Routes — privacy + lifecycle + completion
app.use('/api/account', accountRoutes)
app.use('/api/couple', coupleLifecycleRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/profile', profileCompletionRoutes)  // GET /completion (no choca con profile.ts existente)

// v1.6.1 Cron retención: en producción, dry-run las primeras 2 ejecuciones.
let retentionRunCount = 0
if (RUN_BACKGROUND_JOBS && process.env.NODE_ENV === 'production') {
  cron.schedule('0 4 * * *', async () => {
    const dryRun = retentionRunCount < 2
    try {
      await runRetention({ dryRun })
      retentionRunCount++
    } catch (e) {
      logger.error({ err: e }, '[retention cron] failed')
    }
  })
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Sentry error handler must run BEFORE our final error middleware so it
// captures exceptions with the original stack trace. No-op when SENTRY_DSN
// is missing.
mountSentryErrorHandler(app)

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, 'unhandled request error')
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// v1.3 weekly cron — every Monday at 08:00
if (RUN_BACKGROUND_JOBS) cron.schedule('0 8 * * 1', () => {
  runWeeklyGeneration().catch(err => logger.error({ err }, 'recurringTask cron error'))
  sendWeeklyDigests().catch(err => logger.error({ err }, 'digest cron error'))
})

// v2.2.5 — Daily push digest per user (Claude Design canvas 10).
// Corre cada minuto y manda push a usuarios cuyo `digestHour` coincide con la
// hora actual en su `timezone`. La query es barata; el envío real solo ocurre
// para los matched. Si no hay actividad ni unread del día, omite.
if (RUN_BACKGROUND_JOBS) cron.schedule('* * * * *', async () => {
  try {
    const m = await import('./services/notificationDigestService.js')
    await m.runDigestForCurrentMinute()
  } catch (err) {
    // Solo log si NO es el "import vacío" del entorno tests
    if (process.env.NODE_ENV !== 'test') {
      logger.error({ err }, '[digest cron]')
    }
  }
})

// Freezer reset — every Monday at 00:00 UTC
if (RUN_BACKGROUND_JOBS) cron.schedule('0 0 * * 1', () => {
  resetFreezersOnMonday().catch(err => logger.error({ err }, 'resetFreezers cron error'))
})

// Auto-accept pending TaskLogs older than 24h — runs every hour
if (RUN_BACKGROUND_JOBS) cron.schedule('0 * * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    // Bug 2026-04-22: el cron auto-verificaba CUALQUIER taskLog pending >24h,
    // incluyendo los placeholders auto-generados por la recurrencia. Esos
    // tienen completedBy=null → la PointsTransaction resultante se creaba con
    // userId=undefined, otorgando puntos fantasma por tareas que nadie ha
    // hecho. Sólo auto-aceptamos logs donde un usuario haya marcado la
    // completitud explícitamente.
    const pending = await prisma.taskLog.findMany({
      where: {
        status: 'pending',
        createdAt: { lt: cutoff },
        completedBy: { not: null },
      },
    })
    const affectedCouples = new Set<string>(pending.map((l) => l.coupleId))
    if (pending.length > 0) {
      // audit §4 #2 — antes: un $transaction por TaskLog vencido (N+1 que
      // escalaba con el volumen de pendientes). Ahora: dos operaciones bulk
      // (updateMany + createMany) en una sola transacción atómica. Los logs
      // ya vienen filtrados por completedBy != null, así que userId nunca es
      // null y relatedTaskLogId (UNIQUE) no colisiona (el log estaba pending,
      // sin PointsTransaction previa).
      const now = new Date()
      const ids = pending.map((l) => l.id)
      await prisma.$transaction([
        prisma.taskLog.updateMany({
          where: { id: { in: ids } },
          data: { status: 'verified', verifiedAt: now },
        }),
        prisma.pointsTransaction.createMany({
          data: pending.map((log) => ({
            coupleId: log.coupleId,
            userId: log.completedBy!,
            type: 'task_completed',
            relatedTaskLogId: log.id,
            amount: log.pointsFinal,
            description: 'Auto-verificado tras 24h sin respuesta',
          })),
        }),
      ])
      logger.info({ count: pending.length }, '[cron] auto-verified task logs')
    }
    // Recompute gamification once per affected couple
    for (const coupleId of affectedCouples) {
      try {
        await updateDailyStreak(coupleId)
        await calculateAndSaveXP(coupleId)
        await checkAllAchievements(coupleId)
      } catch (gamErr) {
        logger.error({ err: gamErr, coupleId }, '[cron] gamification recompute error')
      }
    }
  } catch (err) {
    logger.error({ err }, '[cron] auto-accept error')
  }
})

if (RUN_BACKGROUND_JOBS) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, '🚀 Matripuntos backend running')
    logger.info(`📊 Health check: http://localhost:${PORT}/api/health`)
    // v2.0.7 — auto-seed del catálogo de actividades. Idempotente, no bloqueante.
    import('./services/bootstrapCatalog.js')
      .then((m) => m.bootstrapActivityCatalog())
      .catch((err) => logger.error({ err }, '[bootstrap] failed'))
  })
}

// Fase 1 (harness E2E): exportamos `app` para que supertest la monte sin abrir
// puerto. En prod/dev el bloque de arriba sigue arrancando el listener igual.
export { app }
export default app
