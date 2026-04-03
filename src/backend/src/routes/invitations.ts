import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()
const prisma = new PrismaClient()

/**
 * Generate invitation token for partner
 * POST /api/auth/invite-partner
 */
router.post('/invite-partner', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { inviteeEmail } = req.body

    // Validate email
    if (!inviteeEmail || typeof inviteeEmail !== 'string') {
      return res.status(400).json({ error: 'inviteeEmail is required' })
    }

    // Get user and couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const coupleId = user.coupleId

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        coupleId,
        inviteeEmail,
        status: 'pending',
      },
    })

    if (existingInvitation) {
      return res.status(400).json({ error: 'Invitation already sent to this email' })
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7-day expiration

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        coupleId,
        inviterUserId: userId,
        inviteeEmail,
        token,
        status: 'pending',
        expiresAt,
      },
    })

    // Generate invitation link
    const invitationLink = `${process.env.FRONTEND_URL}/onboarding/join/${token}`

    res.status(201).json({
      message: 'Invitation created successfully',
      invitation: {
        id: invitation.id,
        token: invitation.token,
        invitationLink,
        inviteeEmail: invitation.inviteeEmail,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error) {
    console.error('Error creating invitation:', error)
    res.status(500).json({ error: 'Failed to create invitation' })
  }
})

/**
 * Validate invitation token
 * GET /api/auth/invitation/:token
 */
router.get('/invitation/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        couple: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    // Check expiration
    if (new Date() > invitation.expiresAt) {
      return res.status(410).json({ error: 'Invitation has expired' })
    }

    // Check status
    if (invitation.status !== 'pending') {
      return res.status(410).json({ error: 'Invitation is no longer valid' })
    }

    res.json({
      valid: true,
      invitation: {
        id: invitation.id,
        inviteeEmail: invitation.inviteeEmail,
        inviterName: invitation.inviter.name,
        coupleId: invitation.coupleId,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error) {
    console.error('Error validating invitation:', error)
    res.status(500).json({ error: 'Failed to validate invitation' })
  }
})

/**
 * Accept invitation and join couple
 * POST /api/auth/accept-invitation
 */
router.post('/accept-invitation', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Invitation token is required' })
    }

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    // Check expiration
    if (new Date() > invitation.expiresAt) {
      return res.status(410).json({ error: 'Invitation has expired' })
    }

    // Check status
    if (invitation.status !== 'pending') {
      return res.status(410).json({ error: 'Invitation is no longer valid' })
    }

    // Get the invitee user
    const inviteeUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!inviteeUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if email matches
    if (inviteeUser.email !== invitation.inviteeEmail) {
      return res.status(400).json({ error: 'Email does not match invitation' })
    }

    // Update user's couple ID
    await prisma.user.update({
      where: { id: userId },
      data: {
        coupleId: invitation.coupleId,
      },
    })

    // Update invitation status
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        inviteeUserId: userId,
        updatedAt: new Date(),
      },
    })

    // Get updated couple data
    const couple = await prisma.couple.findUnique({
      where: { id: invitation.coupleId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.json({
      message: 'Invitation accepted successfully',
      couple,
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    res.status(500).json({ error: 'Failed to accept invitation' })
  }
})

/**
 * Register with invitation token (new user joins via link)
 * POST /api/auth/register-with-invitation
 */
router.post('/register-with-invitation', async (req: Request, res: Response) => {
  try {
    const { token, email, password, name } = req.body

    // Validate inputs
    if (!token || !email || !password || !name) {
      return res.status(400).json({ error: 'Token, email, password, and name are required' })
    }

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    // Check expiration
    if (new Date() > invitation.expiresAt) {
      return res.status(410).json({ error: 'Invitation has expired' })
    }

    // Check status
    if (invitation.status !== 'pending') {
      return res.status(410).json({ error: 'Invitation is no longer valid' })
    }

    // Check if email matches invitation
    if (email !== invitation.inviteeEmail) {
      return res.status(400).json({ error: 'Email does not match invitation' })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Hash password (using simple bcrypt)
    const bcrypt = require('bcryptjs')
    const passwordHash = await bcrypt.hash(password, 10)

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        coupleId: invitation.coupleId,
        email,
        passwordHash,
        name,
      },
    })

    // Update invitation
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        inviteeUserId: newUser.id,
        updatedAt: new Date(),
      },
    })

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        coupleId: newUser.coupleId,
      },
    })
  } catch (error) {
    console.error('Error registering with invitation:', error)
    res.status(500).json({ error: 'Failed to register' })
  }
})

export default router
