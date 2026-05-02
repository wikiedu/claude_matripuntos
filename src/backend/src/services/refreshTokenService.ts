// v1.8-prep — Refresh token rotation. S1-6 audit fix preparado.
// Estrategia:
//   1. issueRefresh(userId) → genera token aleatorio 32 bytes hex, hash
//      SHA-256 lo persiste, devuelve el plaintext al cliente (única vez).
//   2. rotateRefresh(plaintext, userAgent) → busca por hash, valida no
//      revoked + no expired, lo revoca, emite uno nuevo (chain rotatedFrom).
//   3. revokeAllForUser(userId) → para logout-all-devices.
//   4. detectReuse: si llega un plaintext con hash ya revoked → revocar
//      TODA la cadena del user (compromise detection).
//
// NO ACTIVADO en producción: JWT_EXPIRY sigue 7d. Activación incremental
// en versión dedicada (riesgo: romper sesiones in-flight).

import crypto from 'crypto'
import prisma from '../lib/prisma.js'

const REFRESH_TTL_DAYS = 30

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashRefreshToken(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex')
}

export async function issueRefresh(
  userId: string,
  options?: { rotatedFrom?: string; deviceFingerprint?: string },
): Promise<{ plaintext: string; expiresAt: Date }> {
  const plaintext = generateRefreshToken()
  const tokenHash = hashRefreshToken(plaintext)
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      rotatedFrom: options?.rotatedFrom ?? null,
      deviceFingerprint: options?.deviceFingerprint ?? null,
    },
  })

  return { plaintext, expiresAt }
}

export interface RotateResult {
  ok: boolean
  reason?: 'not_found' | 'revoked' | 'expired' | 'reuse_detected'
  newPlaintext?: string
  newExpiresAt?: Date
  userId?: string
}

export async function rotateRefresh(
  plaintext: string,
  deviceFingerprint?: string,
): Promise<RotateResult> {
  const hash = hashRefreshToken(plaintext)
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } })

  if (!existing) return { ok: false, reason: 'not_found' }
  if (existing.revokedAt) {
    // Reuse detection: si el token ya estaba revocado, alguien intenta
    // re-usarlo. Revocar TODA la chain del user (compromise probable).
    await revokeAllForUser(existing.userId)
    return { ok: false, reason: 'reuse_detected' }
  }
  if (existing.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' }
  }

  // Revocar el actual + emitir uno nuevo encadenado.
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(), lastUsedAt: new Date() },
  })

  const fresh = await issueRefresh(existing.userId, {
    rotatedFrom: existing.id,
    deviceFingerprint,
  })

  return {
    ok: true,
    newPlaintext: fresh.plaintext,
    newExpiresAt: fresh.expiresAt,
    userId: existing.userId,
  }
}

export async function revokeAllForUser(userId: string): Promise<number> {
  const r = await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return r.count
}

export async function purgeExpired(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const r = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  })
  return r.count
}
