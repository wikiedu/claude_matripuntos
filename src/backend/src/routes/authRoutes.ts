import express, { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { signupCouple, loginUser, getUserById, getCoupleData, signupUser } from '../services/authService.js'
import {
  createInvitation,
  acceptEmailInvitation,
  rejectInvitation,
  proposePartner,
  acceptProposal,
  rejectProposal,
  getInvitationByToken,
  getPendingProposalsForUser,
} from '../services/invitationService.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import {
  signupSchema, loginSchema,
  signupUserSchema, inviteSchema, acceptInviteSchema, rejectInviteSchema,
  proposePartnerSchema, proposalActionSchema,
  registerWithCodeSchema,
} from '../schemas/authSchemas.js'
import { ZodError } from 'zod'

import prisma from '../lib/prisma.js'
import { normalizeJoinCode } from '../utils/joinCode.js'
import { demoLogin, isDemoEnabled } from '../services/demoService.js'

const router = express.Router()

// Register/Signup - Create new couple account
// Accepts both /signup and /register endpoints for compatibility
router.post('/register', registerCoupleHandler)

async function registerCoupleHandler(req: Request, res: Response): Promise<void> {
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
}

// Single-user signup
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = signupUserSchema.parse(req.body)
    const user = await signupUser(validated.email, validated.password, validated.name, validated.language)
    const token = jwt.sign({ userId: user.id, coupleId: user.coupleId }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    res.status(201).json({ message: 'Account created', user, token })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' })
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

// Demo mode (quick-win #14). Env-gated: DEMO_MODE_ENABLED must be "true".
// demo-available is a lightweight probe for the login page UI.
router.get('/demo-available', (_req: Request, res: Response) => {
  res.json({ available: isDemoEnabled() })
})

router.post('/demo-login', async (_req: Request, res: Response): Promise<void> => {
  if (!isDemoEnabled()) {
    res.status(404).json({ error: 'Demo mode is not enabled in this environment' })
    return
  }
  try {
    const result = await demoLogin()
    res.json({ message: 'Demo login successful', token: result.token, user: result.user })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Demo login failed'
    res.status(500).json({ error: message })
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

    // Load own profile for avatar/mood/theme
    const myProfile = await prisma.userProfile.findUnique({
      where: { userId: req.userId },
      select: { avatarEmoji: true, avatarColor: true, theme: true, currentMood: true, moodUpdatedAt: true },
    })

    // Load partner mood if couple exists
    let partnerMood: string | null = null
    let partnerName: string | null = null
    if (user.coupleId) {
      const couple = await prisma.couple.findUnique({
        where: { id: user.coupleId },
        include: { users: { include: { profile: { select: { currentMood: true, moodUpdatedAt: true } } } } },
      })
      const partner = couple?.users.find((u: any) => u.id !== req.userId)
      if (partner) {
        partnerName = partner.name
        // Only show mood if updated today
        const today = new Date()
        const moodDate = partner.profile?.moodUpdatedAt
        if (moodDate && new Date(moodDate).toDateString() === today.toDateString()) {
          partnerMood = partner.profile?.currentMood ?? null
        }
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        coupleId: user.coupleId,
        roleInHome: user.roleInHome,
        timezone: (user as any).timezone,
        notificationsPush: (user as any).notificationsPush,
        notificationsEmail: (user as any).notificationsEmail,
        hasCompletedOnboarding: (user as any).hasCompletedOnboarding,
        // Profile fields
        avatarEmoji: myProfile?.avatarEmoji ?? '🐼',
        avatarColor: myProfile?.avatarColor ?? '#7c3aed',
        theme: myProfile?.theme ?? 'dark',
        currentMood: myProfile?.currentMood ?? null,
        // v1.6.5 fix: sin moodUpdatedAt, useMoodVigent en frontend retorna null
        // y el indicador del mood propio nunca aparece aunque el user lo haya
        // puesto. Antes solo se exponía currentMood. El partner sí se mostraba
        // vigente porque /api/points/balance sí devuelve moodUpdatedAt.
        moodUpdatedAt: myProfile?.moodUpdatedAt ?? null,
      },
      partnerMood,
      partnerName,
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
      res.json({ couple: null })
      return
    }

    const couple = await getCoupleData(req.coupleId)

    res.json({
      couple: {
        id: couple.id,
        joinCode: couple.joinCode,
        numChildren: couple.numChildren,
        language: couple.language,
        notificationsEnabled: couple.notificationsEnabled,
        users: couple.users.map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.roleInHome,
          lastSeenAt: u.lastSeenAt ?? null,
          // v1.6.5: campos de UserProfile expuestos para que MoodPairCard,
          // AppHeader y avatar pickers del partner funcionen sin endpoints
          // adicionales.
          currentMood: u.profile?.currentMood ?? null,
          moodUpdatedAt: u.profile?.moodUpdatedAt ?? null,
          avatarEmoji: u.profile?.avatarEmoji ?? null,
          avatarColor: u.profile?.avatarColor ?? null,
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

/**
 * v2.2.3 — Catch-up summary del partner para el onboarding del que llega segundo
 * (Claude Design canvas 08). Devuelve qué tiene el partner ya en marcha:
 * nivel, saldo neto, mood vigente, tareas completadas esta semana, número de
 * plantillas custom configuradas y top categorías con su puntos base.
 *
 * Solo significativo si la pareja tiene 2 users y el otro tiene actividad
 * previa. El frontend decide si muestra el flow catch-up o el normal según
 * `partner.xp > 0` o `lastActivityDate != null`.
 */
router.get('/partner-summary', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId || !req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const couple = await getCoupleData(req.coupleId)
    const partner = couple.users.find((u: any) => u.id !== req.userId)
    if (!partner) {
      res.json({ summary: null })
      return
    }

    // Saldo neto del partner (suma de todas sus PointsTransaction)
    const balanceAgg = await prisma.pointsTransaction.aggregate({
      where: { coupleId: req.coupleId, userId: partner.id },
      _sum: { amount: true },
    })
    const partnerBalance = balanceAgg._sum.amount?.toNumber() ?? 0

    // Tareas verificadas que completó el partner esta semana
    const monday = new Date()
    monday.setHours(0, 0, 0, 0)
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const tasksThisWeek = await prisma.taskLog.count({
      where: {
        coupleId: req.coupleId,
        completedBy: partner.id,
        status: 'verified',
        date: { gte: monday },
      },
    })

    // Plantillas custom de la pareja (cualquiera de los dos las creó)
    const customTemplates = await prisma.activityTemplate.count({
      where: { coupleId: req.coupleId, isActive: true },
    })

    // Resumen de reglas: top 3 categorías por puntos base
    const config = couple.configurations
    const tasksConfig = config ? JSON.parse(config.tasksConfig) : {}
    const topRules = Object.entries(tasksConfig)
      .map(([k, v]) => ({ key: k, value: Number(v) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)

    // Multipliers activos: weekend bonus, etc.
    const multConfig = config ? JSON.parse(config.multipliersConfig) : {}
    const activeMultipliers: string[] = []
    if (multConfig.franja?.mañana && multConfig.franja.mañana > 1) activeMultipliers.push('Bono mañana')
    if (multConfig.franja?.noche && multConfig.franja.noche > 1) activeMultipliers.push('Bono noche')
    if (multConfig.duracion?.larga && multConfig.duracion.larga > 1) activeMultipliers.push('Bono duración larga')

    res.json({
      summary: {
        partner: {
          id: partner.id,
          name: partner.name,
          avatarEmoji: partner.profile?.avatarEmoji ?? '🐼',
          avatarColor: partner.profile?.avatarColor ?? '#7c3aed',
          currentMood: partner.profile?.currentMood ?? null,
          moodUpdatedAt: partner.profile?.moodUpdatedAt ?? null,
        },
        couple: {
          xp: couple.xp ?? 0,
          level: couple.level ?? 'encuentro',
          dailyStreakDays: couple.dailyStreakDays ?? 0,
          createdAt: couple.createdAt,
        },
        partnerBalance,
        tasksThisWeek,
        customTemplates,
        topRules,
        activeMultipliers,
      },
    })
  } catch (error) {
    console.error('[partner-summary] error:', error)
    res.status(500).json({ error: 'Failed to fetch partner summary' })
  }
})

// Send email invitation to partner
router.post('/invite', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'User ID not found' }); return }
    const validated = inviteSchema.parse(req.body)
    const inv = await createInvitation(req.userId, validated.toEmail)
    // Prefer FRONTEND_URL in production; fall back to request origin then localhost for dev.
    const origin = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173'
    res.json({ message: 'Invitation sent', token: inv.token, inviteLink: `${origin}/onboarding/join?token=${inv.token}&email=${encodeURIComponent(validated.toEmail)}` })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' })
  }
})

// Accept email invitation (creates account and links to couple)
router.post('/accept-invite', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = acceptInviteSchema.parse(req.body)
    const inv = await getInvitationByToken(validated.token)
    if (!inv || inv.toEmail !== validated.email) { res.status(400).json({ error: 'Invalid invitation' }); return }
    // signupUser now detects pending invites and auto-links to the inviter's couple.
    const newUser = await signupUser(validated.email, validated.password, validated.name, validated.language)
    const couple = await prisma.couple.findUnique({ where: { id: newUser.coupleId! }, include: { users: true } })
    const token = jwt.sign({ userId: newUser.id, coupleId: newUser.coupleId! }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    res.status(201).json({ message: 'Account created and linked', couple, token })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' })
  }
})

// Reject email invitation
router.post('/reject-invite', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = rejectInviteSchema.parse(req.body)
    await rejectInvitation(validated.token)
    res.json({ message: 'Invitation rejected' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' })
  }
})

// Propose partner (both users already have accounts)
// Audit v1.4 P1-C: never reveal whether an email is registered. Always return
// a generic success response. We still send the proposal when the partner
// exists and isn't the same user, but callers can't distinguish the cases.
router.post('/propose-partner', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'User ID not found' }); return }
    const validated = proposePartnerSchema.parse(req.body)
    const partner = await prisma.user.findUnique({ where: { email: validated.partnerEmail } })
    if (partner && partner.id !== req.userId) {
      try {
        await proposePartner(req.userId, partner.id)
      } catch (inner) {
        console.error('[propose-partner] silent failure:', inner)
      }
    }
    res.json({ message: 'Si la cuenta existe, la propuesta fue enviada' })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' })
  }
})

// Accept partner proposal
router.post('/accept-proposal', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'User ID not found' }); return }
    const validated = proposalActionSchema.parse(req.body)
    const prop = await prisma.invitation.findUnique({ where: { id: validated.invitationId } })
    if (!prop || prop.toUserId !== req.userId) { res.status(404).json({ error: 'Proposal not found' }); return }
    const couple = await acceptProposal(validated.invitationId)
    res.json({ message: 'Proposal accepted', couple })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' })
  }
})

// Reject partner proposal
router.post('/reject-proposal', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'User ID not found' }); return }
    const validated = proposalActionSchema.parse(req.body)
    const prop = await prisma.invitation.findUnique({ where: { id: validated.invitationId } })
    if (!prop || prop.toUserId !== req.userId) { res.status(404).json({ error: 'Proposal not found' }); return }
    await rejectProposal(validated.invitationId)
    res.json({ message: 'Proposal rejected' })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed' })
  }
})

// Get pending proposals for current user
router.get('/proposals', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'User ID not found' }); return }
    const proposals = await getPendingProposalsForUser(req.userId)
    res.json({ proposals })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' })
  }
})

// Public preview of a couple by joinCode — used by the signup flow to show
// "te vas a unir al hogar de X" antes de pedir datos. No revela email ni
// secretKey. Rate-limited por `authLimiter` del server.ts (20 req / 15m).
router.get('/couple-preview/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const normalized = normalizeJoinCode(req.params.code ?? '')
    if (!normalized) {
      res.status(400).json({ error: 'Código inválido' })
      return
    }

    const couple = await prisma.couple.findUnique({
      where: { joinCode: normalized },
      include: { users: { select: { id: true, name: true } } },
    })
    if (!couple) {
      res.status(404).json({ error: 'Código no encontrado' })
      return
    }

    // Si la pareja ya tiene 2 miembros no se puede unir nadie más — devolvemos
    // estado explícito para que el frontend muestre el mensaje correcto.
    const isFull = couple.users.length >= 2

    res.json({
      joinCode: normalized,
      coupleId: couple.id,
      isFull,
      members: couple.users.map((u) => ({ name: u.name })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to preview couple'
    res.status(500).json({ error: message })
  }
})

// Register a new user and link them to an existing couple via joinCode.
// Si la pareja ya está llena (2 miembros), devolvemos 409. Si el joinCode no
// existe, 404. El usuario queda vinculado y recibe JWT inmediato.
router.post('/register-with-code', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = registerWithCodeSchema.parse(req.body)
    const normalized = normalizeJoinCode(validated.joinCode)
    if (!normalized) {
      res.status(400).json({ error: 'Código inválido' })
      return
    }

    const { hashPassword } = await import('../services/authService.js')
    const passwordHash = await hashPassword(validated.password)

    // Audit v1.4 P1-D: the whole join must be atomic. A check-then-create
    // under concurrent load could allow a 3rd user to slip past the
    // `users.length < 2` gate. We wrap the couple lookup, capacity check,
    // email uniqueness check, user creation and notify in one transaction
    // and re-count inside it so Prisma aborts if the couple filled up.
    let txResult: { user: { id: string; email: string; name: string; coupleId: string | null }, coupleId: string }
    try {
      txResult = await prisma.$transaction(async (tx) => {
        const couple = await tx.couple.findUnique({
          where: { joinCode: normalized },
          include: { users: true },
        })
        if (!couple) {
          throw Object.assign(new Error('Código no encontrado'), { httpStatus: 404 })
        }
        if (couple.users.length >= 2) {
          throw Object.assign(new Error('Esta pareja ya está completa'), { httpStatus: 409 })
        }
        const existingUser = await tx.user.findUnique({ where: { email: validated.email } })
        if (existingUser) {
          throw Object.assign(new Error('Ya existe una cuenta con este email'), { httpStatus: 409 })
        }
        const newUser = await tx.user.create({
          data: {
            email: validated.email,
            passwordHash,
            name: validated.name,
            coupleId: couple.id,
            roleInHome: 'equal',
            language: validated.language,
            hasCompletedOnboarding: false,
          },
        })
        const postCount = await tx.user.count({ where: { coupleId: couple.id } })
        if (postCount > 2) {
          throw Object.assign(new Error('Esta pareja ya está completa'), { httpStatus: 409 })
        }
        const inviter = couple.users[0]
        if (inviter) {
          await tx.notification.create({
            data: {
              coupleId: couple.id,
              userId: inviter.id,
              type: 'partner_joined',
              title: '🎉 Tu pareja se ha unido',
              message: `${validated.name} ha creado su cuenta y ya estáis vinculados.`,
              isRead: false,
            },
          })
        }
        return {
          user: { id: newUser.id, email: newUser.email, name: newUser.name, coupleId: newUser.coupleId },
          coupleId: couple.id,
        }
      })
    } catch (txErr) {
      const status = (txErr as any)?.httpStatus ?? 400
      res.status(status).json({ error: txErr instanceof Error ? txErr.message : 'Error' })
      return
    }

    const token = jwt.sign(
      { userId: txResult.user.id, coupleId: txResult.coupleId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Account created and linked',
      token,
      user: txResult.user,
      coupleId: txResult.coupleId,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to register with code'
    res.status(400).json({ error: message })
  }
})

export default router
