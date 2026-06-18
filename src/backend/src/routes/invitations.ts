import { Router, Request, Response } from 'express'
import { requireAuth } from '../lib/requireAuth.js'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { invalidateAuthCache } from '../middleware/authMiddleware.js'
import crypto from 'crypto'
import bcryptjs from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { Prisma } from '@prisma/client'
import { signAccessToken, BCRYPT_ROUNDS } from '../services/authService.js'
import { maybeIssueRefreshPair } from './authRoutes.js'
import { logger } from '../lib/logger.js'
import { parseJsonField } from '../lib/jsonField.js'

// STATUS: deprecación aplazada (Sunset vencido pero en uso por Onboarding.tsx /
// StepJoinAccount.tsx). Retirada y revisión IDOR pospuestas a Fase 1. Ver
// TODO_REFACTOR.md.

// Single source of truth for the signing secret. authService.ts already
// validates length >= 32 on boot, so the env var is guaranteed set here.
// Using a fallback silently would accept invites signed with "your-secret-key"
// in any environment that forgot to set JWT_SECRET — refuse instead.
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET env var must be set and at least 32 characters long')
}

const router = Router()

// Audit v1.4 P1-E: the email-invitation flow below (/invite-partner,
// /invitation/:token, /accept-invitation, /register-with-invitation) is
// superseded by the join-code flow in authRoutes.ts (couple-preview +
// register-with-code). We can't 410 it yet — Onboarding.tsx and
// StepJoinAccount.tsx still depend on it. All responses set a
// `Deprecation` header so callers that migrate can verify. Target v1.5
// to replace the frontend calls and then return 410 here.
const deprecationMiddleware = (_req: Request, res: Response, next: Function) => {
  res.set('Deprecation', 'true')
  res.set('Sunset', 'Mon, 01 Jun 2026 00:00:00 GMT')
  next()
}

// Fase 2 A.2 (audit IDOR/integridad) — invariante de la app: una pareja tiene
// como máximo 2 usuarios. Ninguno de los 4 puntos de entrada a una pareja
// (invite-partner, accept-invitation, register-with-invitation,
// accept-link-partner) re-validaba la capacidad en el momento de unirse, así
// que dos invitaciones aceptadas en paralelo podían crear una pareja de 3.
// `excludeUserId` excluye al caller del conteo (para no contarse a sí mismo).
async function coupleMemberCount(coupleId: string, excludeUserId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      coupleId,
      deletedAt: null,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  })
}

// Fase 3 A1-4 (TOCTOU en el cap de miembros) — sentinel para abortar la
// transacción de join cuando la pareja ya está completa. Distinguible de un
// error inesperado de Prisma para devolver 409 (no 500).
class CapacityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CapacityError'
  }
}

// En Serializable, dos aceptaciones concurrentes hacia la misma pareja chocan:
// Postgres aborta una con P2034 ("Transaction failed due to a write conflict
// or a deadlock"). Tratamos ese conflicto como "pareja completa" (la otra
// request ganó la carrera) en vez de propagar un 500.
function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2034' || error.code === 'P2002')
  )
}

/**
 * Generate invitation token for partner
 * POST /api/auth/invite-partner
 * @deprecated — use /auth/register-with-code with joinCode. Planned removal v1.5.
 */
router.post('/invite-partner', deprecationMiddleware, authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req).userId
    const { inviteeEmail } = req.body

    // v2.7.1 audit 01 S2-R-12 — antes solo verificábamos string truthy.
    // Ahora validamos formato email + lowercase para canonicalizar.
    const emailParse = z.string().email().max(255).safeParse(inviteeEmail)
    if (!emailParse.success) {
      return res.status(400).json({ error: 'inviteeEmail debe ser un email válido' })
    }
    const cleanEmail = emailParse.data.toLowerCase()

    // Get user and couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const coupleId = user.coupleId

    // Fase 2 A.2 — si ya hay otro miembro en mi pareja, no emitir más
    // invitaciones de unión (la pareja está completa).
    if (coupleId && (await coupleMemberCount(coupleId, userId)) >= 1) {
      return res.status(400).json({ error: 'Ya tienes una pareja vinculada.' })
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        coupleId,
        toEmail: cleanEmail,
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
        toEmail: cleanEmail,
        token,
        type: 'email_invite',
        status: 'pending',
        expiresAt,
      },
    })

    // Generate invitation link. Prefer FRONTEND_URL in prod; fall back to request
    // origin header then localhost for dev, so we never emit `undefined/onboarding/...`.
    const origin = process.env.FRONTEND_URL || (req.headers.origin as string) || 'http://localhost:5173'
    const invitationLink = `${origin}/onboarding/join/${token}`

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
    logger.error({ err: error }, 'Error creating invitation')
    res.status(500).json({ error: 'Failed to create invitation' })
  }
})

/**
 * Validate invitation token
 * GET /api/auth/invitation/:token
 * @deprecated — use /auth/couple-preview/:code. Planned removal v1.5.
 */
router.get('/invitation/:token', deprecationMiddleware, async (req: Request, res: Response) => {
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
        inviterName: invitation.fromUser?.name ?? null,
        coupleId: invitation.coupleId,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Error validating invitation')
    res.status(500).json({ error: 'Failed to validate invitation' })
  }
})

/**
 * Accept invitation and join couple
 * POST /api/auth/accept-invitation
 * @deprecated — use /auth/register-with-code. Planned removal v1.5.
 */
router.post('/accept-invitation', deprecationMiddleware, authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req).userId
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

    // Fase 2 A.2 / Fase 3 A1-4 — re-validar capacidad y mover al usuario en
    // UNA transacción serializable. El check (count<2) + update separados eran
    // TOCTOU: dos invitados aceptando hacia la misma pareja en paralelo podían
    // leer count<2 antes de escribir → pareja de 3+ rompiendo el aislamiento
    // "pareja de 2". Recontar dentro de la tx serializa las aceptaciones.
    try {
      await prisma.$transaction(
        async (tx) => {
          const memberCount = await tx.user.count({
            where: { coupleId: invitation.coupleId!, deletedAt: null, id: { not: userId } },
          })
          if (memberCount >= 2) {
            throw new CapacityError('Esa pareja ya está completa.')
          }
          // Update user's couple ID
          await tx.user.update({
            where: { id: userId },
            data: { coupleId: invitation.coupleId },
          })
          // Update invitation status
          await tx.invitation.update({
            where: { id: invitation.id },
            data: { status: 'accepted', toUserId: userId, updatedAt: new Date() },
          })
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    } catch (txError) {
      if (txError instanceof CapacityError) {
        return res.status(409).json({ error: txError.message })
      }
      if (isSerializationConflict(txError)) {
        return res.status(409).json({ error: 'Esa pareja ya está completa.' })
      }
      throw txError
    }
    // Audit v1.4 P1-G: drop cached coupleId for this user.
    invalidateAuthCache(userId)

    // Get updated couple data
    const couple = await prisma.couple.findUnique({
      where: { id: invitation.coupleId! },
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
    logger.error({ err: error }, 'Error accepting invitation')
    res.status(500).json({ error: 'Failed to accept invitation' })
  }
})

/**
 * Register with invitation token (new user joins via link)
 * POST /api/auth/register-with-invitation
 * @deprecated — use /auth/register-with-code. Planned removal v1.5.
 */
router.post('/register-with-invitation', deprecationMiddleware, async (req: Request, res: Response) => {
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

    // Fase 2 A.2 — re-validar capacidad de la pareja destino antes de crear
    // el usuario dentro de ella (misma race que en /accept-invitation).
    if ((await coupleMemberCount(invitation.coupleId!)) >= 2) {
      return res.status(409).json({ error: 'Esa pareja ya está completa.' })
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, BCRYPT_ROUNDS)

    // Bug 2026-04-22: the invitee landed back on StepPair instead of the
    // dashboard because the frontend fired two extra round-trips after
    // registering (PUT /profile/me to flip the flag, GET /auth/me + /auth/couple
    // to refill the store). If any of those flaked, the ProtectedRoute logic
    // sent them to /onboarding with couple=null. We now short-circuit the whole
    // thing: the user is fully onboarded on creation and we return both the
    // JWT and the couple payload in one response.
    const newUser = await prisma.user.create({
      data: {
        coupleId: invitation.coupleId,
        email,
        passwordHash,
        name,
        hasCompletedOnboarding: true,
      },
    })

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        toUserId: newUser.id,
        updatedAt: new Date(),
      },
    })

    const couple = await prisma.couple.findUnique({
      where: { id: invitation.coupleId! },
      include: {
        users: { select: { id: true, email: true, name: true, coupleId: true } },
        configurations: true,
      },
    })

    // #9 Step B: estas rutas deprecadas ahora emiten refresh-pair (opt-in vía
    // X-Want-Refresh, igual que authRoutes) para que sea seguro bajar
    // JWT_ACCESS_EXPIRY a 15m en prod sin dejar sesiones sin poder renovar.
    const authToken = signAccessToken(newUser.id, newUser.coupleId)
    const refreshPair = await maybeIssueRefreshPair(newUser.id, req.headers)

    res.status(201).json({
      message: 'Registration successful',
      token: authToken,
      ...(refreshPair && { refreshToken: refreshPair.refreshToken, refreshExpiresAt: refreshPair.refreshExpiresAt }),
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        coupleId: newUser.coupleId,
        hasCompletedOnboarding: true,
      },
      couple: couple
        ? {
            id: couple.id,
            joinCode: couple.joinCode,
            numChildren: couple.numChildren,
            language: couple.language,
            notificationsEnabled: couple.notificationsEnabled,
            users: couple.users,
            configuration: couple.configurations
              ? {
                  tasksConfig: parseJsonField(couple.configurations.tasksConfig, {}),
                  multipliersConfig: parseJsonField(couple.configurations.multipliersConfig, {}),
                  activityTypes: parseJsonField(couple.configurations.activityTypes, {}),
                }
              : null,
          }
        : null,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error registering with invitation')
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
    const userId = requireAuth(req).userId
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
    logger.error({ err: error }, 'Error sending link request')
    return res.status(500).json({ error: 'Failed to send link request' })
  }
})

/**
 * Get pending link requests sent TO me
 * GET /api/auth/pending-link-requests
 */
router.get('/pending-link-requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req).userId
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
    const userId = requireAuth(req).userId
    const { invitationId } = req.body

    if (!invitationId) return res.status(400).json({ error: 'invitationId is required' })

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, toUserId: userId, type: 'link_request', status: 'pending' },
    })
    if (!invitation) return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada.' })
    if (new Date() > invitation.expiresAt) return res.status(410).json({ error: 'La solicitud ha caducado.' })

    // Fase 2 A.2 / Fase 3 A1-4 — los checks de /link-partner ("ninguno de los
    // dos tiene pareja") se hicieron al CREAR la solicitud; aquí pueden haber
    // caducado. Re-validar ambos lados Y mover al usuario en UNA transacción
    // serializable: el check+update fuera de transacción era TOCTOU (dos
    // invitados aceptando hacia la misma pareja en paralelo podían leer
    // count<2 antes de escribir → pareja de 3+). Con Serializable + recuento
    // dentro de la tx, las aceptaciones concurrentes serializan y una falla.
    try {
      await prisma.$transaction(
        async (tx) => {
          // 1. la pareja del solicitante no se ha completado mientras tanto
          const partnerCount = await tx.user.count({
            where: { coupleId: invitation.coupleId!, deletedAt: null, id: { not: userId } },
          })
          if (partnerCount >= 2) {
            throw new CapacityError('Esa pareja ya está completa.')
          }
          // 2. yo no he vinculado otra pareja mientras tanto (me iría abandonándola)
          const me = await tx.user.findUnique({ where: { id: userId } })
          if (me?.coupleId) {
            const myPartners = await tx.user.count({
              where: { coupleId: me.coupleId, deletedAt: null, id: { not: userId } },
            })
            if (myPartners >= 1) {
              throw new CapacityError('Ya tienes una pareja vinculada.')
            }
          }

          // Move me to the requester's couple
          await tx.user.update({ where: { id: userId }, data: { coupleId: invitation.coupleId! } })
          // Mark invitation accepted
          await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'accepted' } })
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    } catch (txError) {
      if (txError instanceof CapacityError) {
        return res.status(409).json({ error: txError.message })
      }
      // Serialization conflict (P2034) bajo aceptaciones concurrentes: la otra
      // request ganó la carrera; tratamos esto como "pareja completa".
      if (isSerializationConflict(txError)) {
        return res.status(409).json({ error: 'Esa pareja ya está completa.' })
      }
      throw txError
    }
    // Audit v1.4 P1-G: the authMiddleware cache holds this user's old coupleId.
    // Invalidate so the next request re-reads the new link from the DB.
    invalidateAuthCache(userId)

    // Mark the notification as read (if any)
    await prisma.notification.updateMany({
      where: { userId, type: 'LINK_REQUEST', isRead: false },
      data: { isRead: true },
    })

    // Issue a new JWT with the updated coupleId. #9 Step B: además emite
    // refresh-pair (opt-in X-Want-Refresh) para soportar JWT corto en prod.
    const newToken = signAccessToken(userId, invitation.coupleId)
    const refreshPair = await maybeIssueRefreshPair(userId, req.headers)

    const couple = await prisma.couple.findUnique({
      where: { id: invitation.coupleId! },
      include: { users: { select: { id: true, name: true, email: true } } },
    })

    return res.json({
      message: 'Vinculación aceptada',
      token: newToken,
      ...(refreshPair && { refreshToken: refreshPair.refreshToken, refreshExpiresAt: refreshPair.refreshExpiresAt }),
      couple,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error accepting link request')
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
    const userId = requireAuth(req).userId
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
