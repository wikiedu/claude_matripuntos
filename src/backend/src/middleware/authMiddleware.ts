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

    // Verify the user still exists and hasn't been moved to another couple —
    // a zombie token (user deleted or re-linked) must not authenticate.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, coupleId: true },
    })

    if (!user || user.coupleId !== decoded.coupleId) {
      res.status(401).json({ error: 'User no longer valid' })
      return
    }

    req.userId = user.id
    req.coupleId = user.coupleId
    req.user = { id: user.id, coupleId: user.coupleId }

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
