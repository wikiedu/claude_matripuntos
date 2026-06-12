// Augmentación global de Express.Request con los datos de auth que inyecta
// `authMiddleware` (req.userId / req.coupleId / req.user). Vive en un .d.ts
// dedicado — antes estaba embebido en authMiddleware.ts — para que el tipado
// esté disponible en TODA la compilación sin depender de que ese módulo se
// importe, y para preparar el terreno del refactor a `strict: true` (deja de
// hacer falta `(req as any)` en los handlers).
//
// Nota: `userId`/`coupleId` siguen siendo opcionales porque las rutas con
// `optionalAuthMiddleware` pueden no tenerlos. En las rutas protegidas por
// `authMiddleware` están siempre presentes; cuando se active strictNullChecks
// se resolverá caso por caso (helper de aserción o narrowing por ruta).

import 'express'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      coupleId?: string
      user?: { id: string; coupleId: string }
    }
  }
}

export {}
