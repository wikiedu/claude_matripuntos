import express, { Request, Response } from 'express'
import { signupCouple, loginUser, getUserById, getCoupleData } from '../services/authService.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { signupSchema, loginSchema } from '../schemas/authSchemas.js'
import { ZodError } from 'zod'

const router = express.Router()

// Signup - Create new couple account
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = signupSchema.parse(req.body)

    const couple = await signupCouple(
      validated.email1,
      validated.password1,
      validated.name1,
      validated.email2,
      validated.password2,
      validated.name2,
      validated.language
    )

    // Get both users for response
    const users = couple.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      coupleId: u.coupleId,
    }))

    res.status(201).json({
      message: 'Couple registered successfully',
      coupleId: couple.id,
      users,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      })
      return
    }

    const message = error instanceof Error ? error.message : 'Signup failed'
    res.status(400).json({ error: message })
  }
})

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = loginSchema.parse(req.body)

    const result = await loginUser(validated.email, validated.password)

    res.json({
      message: 'Login successful',
      token: result.token,
      user: result.user,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      })
      return
    }

    const message = error instanceof Error ? error.message : 'Login failed'
    res.status(401).json({ error: message })
  }
})

// Get current user (requires auth)
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User ID not found in token' })
      return
    }

    const user = await getUserById(req.userId)

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        coupleId: user.coupleId,
        role: user.role,
        timezone: user.timezone,
        notificationsPush: user.notificationsPush,
        notificationsEmail: user.notificationsEmail,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user'
    res.status(400).json({ error: message })
  }
})

// Get couple data (requires auth)
router.get('/couple', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Couple ID not found in token' })
      return
    }

    const couple = await getCoupleData(req.coupleId)

    res.json({
      couple: {
        id: couple.id,
        numChildren: couple.numChildren,
        language: couple.language,
        notificationsEnabled: couple.notificationsEnabled,
        users: couple.users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
        })),
        configuration: couple.configurations ? {
          tasksConfig: JSON.parse(couple.configurations.tasksConfig),
          multipliersConfig: JSON.parse(couple.configurations.multipliersConfig),
          activityTypes: JSON.parse(couple.configurations.activityTypes),
        } : null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch couple data'
    res.status(400).json({ error: message })
  }
})

export default router
