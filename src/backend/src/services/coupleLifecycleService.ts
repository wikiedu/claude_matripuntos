// v1.6.1 — Salir de pareja: dissolveCouple marca el couple como disuelto y
// reasigna cada user activo a un Couple individual nuevo. El couple antiguo
// queda con todos sus datos accesibles read-only via /api/history/past-couples.
// Idempotente.

import crypto from 'crypto'
import prisma from '../lib/prisma.js'

// Devuelve los IDs de los users reasignados (couple nuevo). El caller los usa
// para invalidar la auth-cache + revocar refresh tokens: tras reasignar el
// coupleId, el JWT viejo y la entrada cacheada apuntan al couple disuelto, así
// que sin invalidación habría acceso residual hasta 60s (audit p3:A1-1).
export async function dissolveCouple(coupleId: string): Promise<string[]> {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: { users: { where: { deletedAt: null } } },
  })
  if (!couple) throw new Error('Couple not found')
  if (couple.dissolvedAt) return []  // idempotente

  const reassignedUserIds = couple.users.map((u) => u.id)

  await prisma.$transaction(async (tx) => {
    // v2.5.4 audit 02 S1 — rotamos el secretKey del couple disuelto para
    // que no sea reutilizable si en el futuro alguna ruta lo trata como
    // factor de auth/join. El joinCode también lo invalidamos (set null).
    // Defensa en profundidad: el couple sigue accessible read-only por id.
    await tx.couple.update({
      where: { id: coupleId },
      data: {
        dissolvedAt: new Date(),
        secretKey: `dissolved-${coupleId}-${crypto.randomBytes(8).toString('hex')}`,
        joinCode: null,
      },
    })

    for (const user of couple.users) {
      const newCouple = await tx.couple.create({
        data: {
          secretKey: crypto.randomBytes(16).toString('hex'),
          numChildren: 0,
          language: couple.language ?? 'es',
        },
      })
      await tx.user.update({ where: { id: user.id }, data: { coupleId: newCouple.id } })
    }
  })

  return reassignedUserIds
}
