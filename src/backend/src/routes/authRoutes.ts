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
} from '../schemas/authSchemas.js'
import { ZodError } from 'zod'

import prisma from '../lib/prisma.js'

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
        // Profile fields
        avatarEmoji: myProfile?.avatarEmoji ?? '🐼',
        avatarColor: myProfile?.avatarColor ?? '#7c3aed',
        theme: myProfile?.theme ?? 'dark',
        currentMood: myProfile?.currentMood ?? null,
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
        numChildren: couple.numChildren,
        language: couple.language,
        notificationsEnabled: couple.notificationsEnabled,
        users: couple.users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.roleInHome,
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

// Send email invitation to partner
router.post('/invite', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'User ID not found' }); return }
    const validated = inviteSchema.parse(req.body)
    const inv = await createInvitation(req.userId, validated.toEmail)
    res.json({ message: 'Invitation sent', token: inv.token, inviteLink: `http://localhost:5173/onboarding/join?token=${inv.token}&email=${validated.toEmail}` })
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
    const newUser = await signupUser(validated.email, validated.password, validated.name, validated.language)
    const couple = await acceptEmailInvitation(validated.token, newUser.id)
    const token = jwt.sign({ userId: newUser.id, coupleId: couple.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })
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
router.post('/propose-partner', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) { res.status(401).json({ error: 'User ID not found' }); return }
    const validated = proposePartnerSchema.parse(req.body)
    const partner = await prisma.user.findUnique({ where: { email: validated.partnerEmail } })
    if (!partner) { res.status(404).json({ error: 'User not found' }); return }
    if (partner.id === req.userId) { res.status(400).json({ error: 'Cannot propose yourself' }); return }
    const prop = await proposePartner(req.userId, partner.id)
    res.json({ message: 'Proposal sent', expiresAt: prop.expiresAt })
  } catch (error) {
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

export default router
