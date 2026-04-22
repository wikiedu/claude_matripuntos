import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
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
import cron from 'node-cron'
import { runWeeklyGeneration } from './services/recurringTaskService.js'
import { sendWeeklyDigests } from './services/digestService.js'
import { resetFreezersOnMonday, updateDailyStreak, calculateAndSaveXP } from './services/gamificationService.js'
import { checkAllAchievements } from './services/achievementCheckService.js'
import prisma from './lib/prisma.js'
import { execSync } from 'child_process'

dotenv.config()

// v1.4 — Apply pending Prisma migrations on startup. Robust to whatever
// start command Render's dashboard is configured with (npm start vs
// node dist/server.js directly). Idempotent: no-op if schema is current.
// Fails the process if migration errors, so the server never boots with
// a code/schema mismatch.
if (process.env.NODE_ENV !== 'test') {
  try {
    console.log('[startup] applying prisma migrations…')
    execSync('npx --yes prisma migrate deploy --schema=./prisma/schema.prisma', {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    console.log('[startup] prisma migrations up to date')
  } catch (err) {
    console.error('[startup] prisma migrate deploy failed:', err)
    process.exit(1)
  }
}

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:4173']

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/negotiations', negotiationRoutes)
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

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
    const pending = await prisma.taskLog.findMany({
      where: { status: 'pending', createdAt: { lt: cutoff } },
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
})
