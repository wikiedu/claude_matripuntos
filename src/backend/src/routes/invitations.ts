import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth.js'
import crypto from 'crypto'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'

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
        toEmail: inviteeEmail,
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
        fromUserId: userId,
        toEmail: inviteeEmail,
        token,
        type: 'email_invite',
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
        inviteeEmail: invitation.toEmail,
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
        fromUser: {
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
        inviteeEmail: invitation.toEmail,
        inviterName: invitation.fromUser.name,
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
    if (inviteeUser.email !== invitation.toEmail) {
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
        toUserId: userId,
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
    if (email !== invitation.toEmail) {
      return res.status(400).json({ error: 'Email does not match invitation' })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 10)

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
        toUserId: newUser.id,
        updatedAt: new Date(),
      },
    })

    const token = jwt.sign(
      { userId: newUser.id, coupleId: newUser.coupleId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Registration successful',
      token,
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

/**
 * Request to link an existing user as partner (sends notification, requires acceptance)
 * POST /api/auth/link-partner
 * Body: { partnerEmail: string }
 */
router.post('/link-partner', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { partnerEmail } = req.body

    if (!partnerEmail || typeof partnerEmail !== 'string') {
      return res.status(400).json({ error: 'partnerEmail is required' })
    }

    const me = await prisma.user.findUnique({ where: { id: userId }, include: { couple: { include: { users: true } } } })
    if (!me) return res.status(404).json({ error: 'User not found' })

    const myCouple = me.couple
    if (!myCouple) return res.status(400).json({ error: 'You are not linked to any couple yet' })

    const alreadyHasPartner = myCouple.users.some(u => u.id !== userId)
    if (alreadyHasPartner) {
      return res.status(400).json({ error: 'Ya tienes una pareja vinculada.' })
    }

    const partner = await prisma.user.findUnique({ where: { email: partnerEmail }, include: { couple: { include: { users: true } } } })
    if (!partner) {
      return res.status(404).json({ error: 'No existe ninguna cuenta con ese email. Pídele que se registre primero.' })
    }
    if (partner.id === userId) {
      return res.status(400).json({ error: 'No puedes vincularte contigo mismo.' })
    }

    // Partner must not already have a different partner
    if (partner.couple && partner.couple.users.some(u => u.id !== partner.id)) {
      return res.status(400).json({ error: 'Ese usuario ya tiene pareja asociada.' })
    }

    // Check no pending request already exists
    const existing = await prisma.invitation.findFirst({
      where: { fromUserId: userId, toUserId: partner.id, type: 'link_request', status: 'pending' },
    })
    if (existing) {
      return res.status(400).json({ error: 'Ya has enviado una solicitud a este usuario. Está pendiente de aceptación.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await prisma.invitation.create({
      data: {
        fromUserId: userId,
        toUserId: partner.id,
        token,
        type: 'link_request',
        status: 'pending',
        coupleId: myCouple.id,  // the couple the partner will join
        expiresAt,
      },
    })

    // Notify the partner (in their own couple scope)
    if (partner.coupleId) {
      await prisma.notification.create({
        data: {
          coupleId: partner.coupleId,
          userId: partner.id,
          type: 'LINK_REQUEST',
          title: 'Solicitud de vinculación',
          message: `${me.name} quiere vincularse contigo como pareja en Matripuntos. Ve a Configuración → Tu Pareja para aceptar.`,
          isRead: false,
        },
      })
    }

    return res.json({ message: 'Solicitud enviada. Tu pareja recibirá una notificación para aceptar.' })
  } catch (error) {
    console.error('Error sending link request:', error)
    return res.status(500).json({ error: 'Failed to send link request' })
  }
})

/**
 * Get pending link requests sent TO me
 * GET /api/auth/pending-link-requests
 */
router.get('/pending-link-requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const requests = await prisma.invitation.findMany({
      where: {
        toUserId: userId,
        type: 'link_request',
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
      },
    })
    return res.json({ requests })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch link requests' })
  }
})

/**
 * Accept a link request — moves me to the requester's couple, returns new JWT
 * POST /api/auth/accept-link-partner
 * Body: { invitationId: string }
 */
router.post('/accept-link-partner', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { invitationId } = req.body

    if (!invitationId) return res.status(400).json({ error: 'invitationId is required' })

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, toUserId: userId, type: 'link_request', status: 'pending' },
    })
    if (!invitation) return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada.' })
    if (new Date() > invitation.expiresAt) return res.status(410).json({ error: 'La solicitud ha caducado.' })

    // Move me to the requester's couple
    await prisma.user.update({ where: { id: userId }, data: { coupleId: invitation.coupleId! } })

    // Mark invitation accepted
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'accepted' } })

    // Mark the notification as read (if any)
    await prisma.notification.updateMany({
      where: { userId, type: 'LINK_REQUEST', isRead: false },
      data: { isRead: true },
    })

    // Issue a new JWT with the updated coupleId
    const jwt = await import('jsonwebtoken')
    const newToken = jwt.default.sign(
      { userId, coupleId: invitation.coupleId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    const couple = await prisma.couple.findUnique({
      where: { id: invitation.coupleId! },
      include: { users: { select: { id: true, name: true, email: true } } },
    })

    return res.json({ message: 'Vinculación aceptada', token: newToken, couple })
  } catch (error) {
    console.error('Error accepting link request:', error)
    return res.status(500).json({ error: 'Failed to accept link request' })
  }
})

/**
 * Reject a link request
 * POST /api/auth/reject-link-partner
 * Body: { invitationId: string }
 */
router.post('/reject-link-partner', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { invitationId } = req.body

    await prisma.invitation.updateMany({
      where: { id: invitationId, toUserId: userId, type: 'link_request', status: 'pending' },
      data: { status: 'rejected' },
    })

    return res.json({ message: 'Solicitud rechazada.' })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reject link request' })
  }
})

export default router
