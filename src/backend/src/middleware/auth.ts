// Single source of truth — all routes should import from here
export { authMiddleware as authenticateToken, optionalAuthMiddleware as optionalAuthToken } from './authMiddleware.js'
