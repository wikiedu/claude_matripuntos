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
import negotiationV2Routes from './routes/negotiation.js'
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

initSentry()

const app = express()
const PORT = process.env.PORT || 3000

// Sentry request handler must run before any other middleware/routes so
// every request is traced. No-op when SENTRY_DSN is missing.
mountSentryRequestHandler(app)

// Middleware
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:4173']

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
app.use('/api/events', negotiationV2Routes)

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
if (process.env.NODE_ENV === 'production') {
  cron.schedule('0 4 * * *', async () => {
    const dryRun = retentionRunCount < 2
    try {
      await runRetention({ dryRun })
      retentionRunCount++
    } catch (e) {
      console.error('[retention cron] failed', e)
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
  console.error('Error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// v1.3 weekly cron — every Monday at 08:00
cron.schedule('0 8 * * 1', () => {
  runWeeklyGeneration().catch(err => console.error('recurringTask cron error:', err))
  sendWeeklyDigests().catch(err => console.error('digest cron error:', err))
})

// Freezer reset — every Monday at 00:00 UTC
cron.schedule('0 0 * * 1', () => {
  resetFreezersOnMonday().catch(err => console.error('resetFreezers cron error:', err))
})

// Auto-accept pending TaskLogs older than 24h — runs every hour
cron.schedule('0 * * * *', async () => {
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
    const affectedCouples = new Set<string>()
    for (const log of pending) {
      await prisma.$transaction([
        prisma.taskLog.update({
          where: { id: log.id },
          data: { status: 'verified', verifiedAt: new Date() },
        }),
        prisma.pointsTransaction.create({
          data: {
            coupleId: log.coupleId,
            userId: log.completedBy ?? undefined,
            type: 'task_completed',
            relatedTaskLogId: log.id,
            amount: log.pointsFinal,
            description: 'Auto-verificado tras 24h sin respuesta',
          },
        }),
      ])
      affectedCouples.add(log.coupleId)
    }
    if (pending.length > 0) {
      console.log(`[cron] Auto-verified ${pending.length} task log(s)`)
    }
    // Recompute gamification once per affected couple
    for (const coupleId of affectedCouples) {
      try {
        await updateDailyStreak(coupleId)
        await calculateAndSaveXP(coupleId)
        await checkAllAchievements(coupleId)
      } catch (gamErr) {
        console.error('[cron] gamification recompute error:', gamErr)
      }
    }
  } catch (err) {
    console.error('[cron] auto-accept error:', err)
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Matripuntos backend running on http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  // v2.0.7 — auto-seed del catálogo de actividades. Idempotente, no bloqueante.
  import('./services/bootstrapCatalog.js')
    .then((m) => m.bootstrapActivityCatalog())
    .catch((err) => console.error('[bootstrap] failed', err))
})
