import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/authService.js'
import prisma from '../lib/prisma.js'

// Extend Express Request type to include auth data
declare global {
  namespace Express {
    interface Request {
      userId?: string
      coupleId?: string
      user?: { id: string; coupleId: string }
    }
  }
}

// Audit v1.4 P1-G: cache the per-user lookup so every authed request doesn't
// hit Prisma just to re-confirm the user still exists. Keyed by userId with
// a 60s TTL — short enough that partner-linking or account deletion takes
// effect within a minute, long enough to absorb bursts (dashboard loads 10+
// queries in parallel). Invalidate explicitly via invalidateAuthCache() from
// the few call sites that mutate coupleId (accept-link-partner,
// register-with-code). JWT revocation still happens on token expiry.
const AUTH_CACHE_TTL_MS = 60 * 1000
const authCache = new Map<string, { coupleId: string; expiresAt: number }>()

// Presence: throttle per-user lastSeenAt writes so a burst of authed requests
// doesn't turn into N UPDATE statements. 60s is fine-grained enough for the
// "X está en línea ahora" indicator and keeps DB write amplification low.
const PRESENCE_THROTTLE_MS = 60 * 1000
const lastSeenWriteAt = new Map<string, number>()

function touchLastSeen(userId: string): void {
  const now = Date.now()
  const last = lastSeenWriteAt.get(userId) ?? 0
  if (now - last < PRESENCE_THROTTLE_MS) return
  lastSeenWriteAt.set(userId, now)
  // Fire-and-forget. A transient DB error here must never break the request.
  prisma.user
    .update({ where: { id: userId }, data: { lastSeenAt: new Date(now) } })
    .catch(() => {})
}

export function invalidateAuthCache(userId?: string): void {
  if (userId) {
    authCache.delete(userId)
  } else {
    authCache.clear()
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' })
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    const decoded = verifyToken(token)
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    const now = Date.now()
    const cached = authCache.get(decoded.userId)
    let userCoupleId: string | null = null

    if (cached && cached.expiresAt > now) {
      userCoupleId = cached.coupleId
    } else {
      // Verify the user still exists and hasn't been moved to another couple —
      // a zombie token (user deleted or re-linked) must not authenticate.
      // v1.7 fix S1-4: rechazar usuarios soft-deleted (deletedAt != null).
      // El JWT vive 7d tras delete-account; un token viejo intentaría
      // autenticarse contra el ghost. Filtrar aquí cierra el escenario.
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, coupleId: true, deletedAt: true },
      })

      if (!user || !user.coupleId || user.deletedAt) {
        authCache.delete(decoded.userId)
        res.status(401).json({ error: 'User no longer valid' })
        return
      }

      userCoupleId = user.coupleId
      authCache.set(decoded.userId, {
        coupleId: user.coupleId,
        expiresAt: now + AUTH_CACHE_TTL_MS,
      })
    }

    if (userCoupleId !== decoded.coupleId) {
      authCache.delete(decoded.userId)
      res.status(401).json({ error: 'User no longer valid' })
      return
    }

    req.userId = decoded.userId
    req.coupleId = userCoupleId
    req.user = { id: decoded.userId, coupleId: userCoupleId }

    touchLastSeen(decoded.userId)

    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

// Optional auth middleware - doesn't fail if no token
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)

      if (decoded) {
        req.userId = decoded.userId
        req.coupleId = decoded.coupleId
      }
    }

    next()
  } catch (error) {
    next()
  }
}
