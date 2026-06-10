import type { Request } from 'express'

// Devuelve el contexto de auth que `authMiddleware` garantiza en las rutas
// protegidas (req.user siempre presente). Bajo strict:true los handlers ya no
// pueden leer `req.user.id` directamente porque el tipo es opcional (las rutas
// con `optionalAuthMiddleware` —solo premium— NO setean req.user). Este helper
// estrecha el tipo de forma honesta: si se usa por error en una ruta sin
// authMiddleware lanza (bug de programación, nunca debería ocurrir en runtime),
// en vez de mentir al compilador haciendo `user` no-opcional globalmente.
export function requireAuth(req: Request): { userId: string; coupleId: string } {
  const u = req.user
  if (!u) {
    throw new Error('requireAuth: req.user indefinido (¿falta authMiddleware en la ruta?)')
  }
  return { userId: u.id, coupleId: u.coupleId }
}
