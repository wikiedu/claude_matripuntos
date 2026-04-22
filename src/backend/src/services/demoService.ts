// Demo mode (quick-win #14). Exposes a single "try the app" login that is
// gated by DEMO_MODE_ENABLED=true. Lazily seeds a stable demo couple on
// the first call so deploy doesn't need any manual setup — after that,
// subsequent logins reuse the same couple (demo data persists across
// sessions; users can reset via the seed script below if needed).
//
// IMPORTANT: the /auth/demo-login endpoint is effectively a public login.
// It must only be available when DEMO_MODE_ENABLED=true, and the demo
// couple must never be confused with a real couple (mark with isDemo).

import { hashPassword, generateToken } from './authService.js'
import prisma from '../lib/prisma.js'
import { generateUniqueJoinCode } from '../utils/joinCode.js'

const DEMO_EMAIL = 'demo@matripuntos.app'
const DEMO_PARTNER_EMAIL = 'demo.pareja@matripuntos.app'

export function isDemoEnabled(): boolean {
  return process.env.DEMO_MODE_ENABLED === 'true'
}

async function ensureDemoCouple(): Promise<{ userId: string; coupleId: string }> {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })
  if (existing && existing.coupleId) {
    return { userId: existing.id, coupleId: existing.coupleId }
  }

  // First-time setup. Create couple + two users + baseline configuration
  // + a couple of seed transactions so the dashboard doesn't feel empty.
  const pwd = await hashPassword('demo-password-never-used-via-login-form')
  const joinCode = await generateUniqueJoinCode(prisma)

  const couple = await prisma.couple.create({
    data: {
      secretKey: `demo-${Date.now()}`,
      joinCode,
      numChildren: 1,
      language: 'es',
    },
  })

  const [u1, u2] = await Promise.all([
    prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        passwordHash: pwd,
        name: 'Ana (demo)',
        coupleId: couple.id,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.create({
      data: {
        email: DEMO_PARTNER_EMAIL,
        passwordHash: pwd,
        name: 'Leo (demo)',
        coupleId: couple.id,
        hasCompletedOnboarding: true,
      },
    }),
  ])

  // Seed a handful of points transactions so Balance hero isn't empty.
  // Numbers chosen so Ana is slightly ahead — a realistic-feeling state.
  await prisma.pointsTransaction.createMany({
    data: [
      { coupleId: couple.id, userId: u1.id, type: 'task_completed', amount: 8 },
      { coupleId: couple.id, userId: u1.id, type: 'task_completed', amount: 5 },
      { coupleId: couple.id, userId: u2.id, type: 'task_completed', amount: 6 },
    ],
  })

  return { userId: u1.id, coupleId: couple.id }
}

export async function demoLogin(): Promise<{ token: string; user: { id: string; email: string; name: string; coupleId: string } }> {
  const { userId, coupleId } = await ensureDemoCouple()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, coupleId: true },
  })
  if (!user || !user.coupleId) {
    throw new Error('Demo user provisioning failed')
  }
  const token = generateToken(user.id, user.coupleId)
  return { token, user: { id: user.id, email: user.email, name: user.name, coupleId: user.coupleId } }
}
