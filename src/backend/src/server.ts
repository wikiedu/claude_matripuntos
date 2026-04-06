import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
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
import calendarRoutes from './routes/calendar.js'
import analyticsRoutes from './routes/analytics.js'
import activityRoutes from './routes/activityRoutes.js'
import invitationRoutes from './routes/invitations.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
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

// Calendar Routes (FASE 5)
app.use('/api/calendar', calendarRoutes)

// Analytics Routes (FASE 6)
app.use('/api/analytics', analyticsRoutes)

// Activity Routes
app.use('/api/recent-activity', activityRoutes)

// Invitation + partner linking routes
app.use('/api/auth', invitationRoutes)

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

app.listen(PORT, () => {
  console.log(`🚀 Matripuntos backend running on http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
})
