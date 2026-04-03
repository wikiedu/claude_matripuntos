import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/authService.js'

// Extend Express Request type to include auth data
declare global {
  namespace Express {
    interface Request {
      userId?: string
      coupleId?: string
      user?: {
        id: string
        coupleId: string
      }
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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

    req.userId = decoded.userId
    req.coupleId = decoded.coupleId
    req.user = {
      id: decoded.userId,
      coupleId: decoded.coupleId,
    }

    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

// Optional auth middleware - doesn't fail if no token
export const optionalAuthToken = (
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
        req.user = {
          id: decoded.userId,
          coupleId: decoded.coupleId,
        }
      }
    }

    next()
  } catch (error) {
    next()
  }
}
