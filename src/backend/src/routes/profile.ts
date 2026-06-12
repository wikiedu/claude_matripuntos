import { Router, Request, Response } from 'express'
import { requireAuth } from '../lib/requireAuth.js'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { UserProfileInput, CoupleProfileInput, OnboardingData } from '../types/v2.js'
import { MOOD_KEYS } from '../data/moodKeys.js'

const router = Router()
import prisma from '../lib/prisma.js'
import { logger } from '../lib/logger.js'
import { parseJsonField } from '../lib/jsonField.js'
import { getPreferencesForUser, setPreferencesForUser } from '../services/notificationPreferencesService.js'

// v1.6 — Schema canónico para PUT /me. El test hermético en
// tests/profileContract.test.ts replica este schema; si éste cambia, el
// test debe actualizarse para mantener el wire contract.
const profileUpdateSchema = z.object({
  surname: z.string().max(80).optional(),
  profilePhotoUrl: z.string().url().nullable().optional(),
  weeklyWorkHours: z.number().int().min(0).max(80).optional(),
  workMode: z.enum(['presencial', 'remoto', 'hibrido']).optional(),
  avatarEmoji: z.string().max(8).optional(),
  avatarColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  currentMood: z.enum(MOOD_KEYS as unknown as [string, ...string[]]).nullable().optional(),
  hasCompletedOnboarding: z.boolean().optional(),
})

// Middleware to ensure user is authenticated
router.use(authenticateToken)

/**
 * Complete user profile during onboarding
 * POST /api/profile/user
 */
router.post('/user', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req).userId
    const data: UserProfileInput = req.body

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Create or update user profile
    let profile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    if (profile) {
      // Update existing profile
      profile = await prisma.userProfile.update({
        where: { userId },
        data: {
          surname: data.surname,
          profilePhotoUrl: data.profilePhotoUrl,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          weeklyWorkHours: data.weeklyWorkHours,
          workMode: data.workMode,
          workSchedule: data.workSchedule ? JSON.stringify(data.workSchedule) : null,
          taskPreferencesLoves: JSON.stringify(data.taskPreferencesLoves || []),
          taskPreferencesDislikes: JSON.stringify(data.taskPreferencesDislikes || []),
        },
      })
    } else {
      // Create new profile
      profile = await prisma.userProfile.create({
        data: {
          userId,
          surname: data.surname,
          profilePhotoUrl: data.profilePhotoUrl,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          weeklyWorkHours: data.weeklyWorkHours || 40,
          workMode: data.workMode || 'presencial',
          workSchedule: data.workSchedule ? JSON.stringify(data.workSchedule) : null,
          taskPreferencesLoves: JSON.stringify(data.taskPreferencesLoves || []),
          taskPreferencesDislikes: JSON.stringify(data.taskPreferencesDislikes || []),
        },
      })
    }

    // Mark user as completed onboarding
    await prisma.user.update({
      where: { id: userId },
      data: { hasCompletedOnboarding: true },
    })

    res.json({
      message: 'Profile completed successfully',
      profile,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error completing user profile')
    res.status(500).json({ error: 'Failed to complete profile' })
  }
})

/**
 * Get user profile
 * GET /api/profile/user/:userId
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const currentUserId = requireAuth(req).userId

    // Users can only view their own profile or partner's profile
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    })

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (userId !== currentUserId && userId !== currentUser.coupleId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    // Parse JSON fields
    const parsedProfile = {
      ...profile,
      taskPreferencesLoves: parseJsonField<string[]>(profile.taskPreferencesLoves, []),
      taskPreferencesDislikes: parseJsonField<string[]>(profile.taskPreferencesDislikes, []),
      workSchedule: parseJsonField(profile.workSchedule, null),
    }

    res.json(parsedProfile)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user profile')
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

/**
 * Complete couple profile
 * POST /api/profile/couple
 */
router.post('/couple', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req).userId
    const data: CoupleProfileInput = req.body

    // Get user's couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const coupleId = user.coupleId ?? undefined

    // Create or update couple profile
    let coupleProfile = await prisma.coupleProfile.findUnique({
      where: { coupleId },
    })

    if (coupleProfile) {
      // Update existing
      coupleProfile = await prisma.coupleProfile.update({
        where: { coupleId },
        data: {
          homeType: data.homeType,
          homeSizeM2: data.homeSizeM2,
          cohabitation: data.cohabitation ? JSON.stringify(data.cohabitation) : null,
          externalServices: data.externalServices ? JSON.stringify(data.externalServices) : null,
        },
      })
    } else {
      // Create new
      coupleProfile = await prisma.coupleProfile.create({
        data: {
          coupleId: coupleId!,
          homeType: data.homeType,
          homeSizeM2: data.homeSizeM2,
          cohabitation: data.cohabitation ? JSON.stringify(data.cohabitation) : null,
          externalServices: data.externalServices ? JSON.stringify(data.externalServices) : null,
        },
      })
    }

    res.json({
      message: 'Couple profile completed successfully',
      profile: coupleProfile,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error completing couple profile')
    res.status(500).json({ error: 'Failed to complete couple profile' })
  }
})

/**
 * Get couple profile
 * GET /api/profile/couple
 */
router.get('/couple', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req).userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const coupleProfile = await prisma.coupleProfile.findUnique({
      where: { coupleId: user.coupleId ?? undefined },
    })

    if (!coupleProfile) {
      return res.status(404).json({ error: 'Couple profile not found' })
    }

    // Parse JSON fields
    const parsedProfile = {
      ...coupleProfile,
      cohabitation: parseJsonField(coupleProfile.cohabitation, null),
      externalServices: parseJsonField(coupleProfile.externalServices, null),
    }

    res.json(parsedProfile)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching couple profile')
    res.status(500).json({ error: 'Failed to fetch couple profile' })
  }
})

/**
 * PUT /api/profile/me
 * Update current user's profile preferences (avatar/mood/theme) and/or
 * the `hasCompletedOnboarding` flag on the parent User. Creates an empty
 * UserProfile lazily — useful for seed scripts and the invite-link flow,
 * where the user exists but no profile row has been created yet.
 */
router.put('/me', async (req: Request, res: Response) => {
  const userId = requireAuth(req).userId
  const coupleId = requireAuth(req).coupleId

  const parsed = profileUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.issues })
  }
  const body = parsed.data

  try {
    // v1.6 — Toda la mutación en una sola transacción para que profile + user +
    // MoodLog queden consistentes. Si algo falla, nada se aplica.
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.userProfile.findUnique({ where: { userId } })

      // Construir el patch del UserProfile
      const profileFields: any = {}
      if (body.surname !== undefined) profileFields.surname = body.surname
      if (body.profilePhotoUrl !== undefined) profileFields.profilePhotoUrl = body.profilePhotoUrl
      if (body.weeklyWorkHours !== undefined) profileFields.weeklyWorkHours = body.weeklyWorkHours
      if (body.workMode !== undefined) profileFields.workMode = body.workMode
      if (body.avatarEmoji !== undefined) profileFields.avatarEmoji = body.avatarEmoji
      if (body.avatarColor !== undefined) profileFields.avatarColor = body.avatarColor
      if (body.theme !== undefined) profileFields.theme = body.theme

      if (body.currentMood !== undefined) {
        profileFields.currentMood = body.currentMood
        // Setear moodUpdatedAt al timestamp actual cuando hay mood,
        // o limpiar a null cuando se borra (currentMood: null).
        profileFields.moodUpdatedAt = body.currentMood ? new Date() : null
      }

      const profile = await tx.userProfile.upsert({
        where: { userId },
        update: profileFields,
        create: { userId, ...profileFields },
      })

      if (typeof body.hasCompletedOnboarding === 'boolean') {
        await tx.user.update({
          where: { id: userId },
          data: { hasCompletedOnboarding: body.hasCompletedOnboarding },
        })
      }

      // v1.6 — MoodLog con anti-spam <5 min.
      // Solo se loguea si:
      //  (a) el mood cambió respecto al actual del UserProfile, o
      //  (b) el último log de este user es de hace >5 min (evita escribir
      //      múltiples logs si el user toca el mismo mood varias veces seguidas).
      if (body.currentMood) {
        const lastLog = await tx.moodLog.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        })
        const fiveMinAgoMs = Date.now() - 5 * 60 * 1000
        const moodChanged = body.currentMood !== existing?.currentMood
        const lastLogStale = !lastLog || lastLog.createdAt.getTime() < fiveMinAgoMs
        const shouldLog = moodChanged ? (!lastLog || lastLog.moodKey !== body.currentMood || lastLogStale) : lastLogStale

        if (shouldLog && coupleId) {
          await tx.moodLog.create({
            data: { userId, coupleId, moodKey: body.currentMood },
          })
        }
      }

      return profile
    })

    res.json({ message: 'Profile updated', profile: result })
  } catch (error) {
    logger.error({ err: error }, 'Error updating profile')
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

/**
 * GET /api/profile/mood-history
 * v1.6 — Devuelve el histórico personal de moods agrupado por día local
 * en la TZ pedida. Solo del user autenticado, nunca del partner.
 *
 * Query params:
 *  - days: int 1-30, default 7
 *  - tz: IANA timezone, default 'Europe/Madrid'
 *
 * Response:
 *  { tz, days, history: [{ date, moodKey: string|null, emoji?, label? }] }
 */
const moodHistoryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
  tz: z.string().default('Europe/Madrid'),
})

router.get('/mood-history', async (req: Request, res: Response) => {
  const userId = requireAuth(req).userId

  const parsed = moodHistoryQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.issues })
  }
  const { days, tz } = parsed.data

  // Validar TZ — Intl arroja RangeError si la zona no es válida.
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
  } catch {
    return res.status(400).json({ error: 'TZ inválida' })
  }

  // Cargar metadata moods (lazy, evita ciclo de imports al top-level con tests).
  const { MOOD_BY_KEY } = await import('../data/moodKeysExtended.js')

  try {
    // Margen de 1 día extra para no perder logs cerca del límite por cambios de TZ.
    const since = new Date(Date.now() - (days + 1) * 24 * 60 * 60 * 1000)
    const logs = await prisma.moodLog.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    })

    // Agrupar por día local en la TZ pedida; el último log del día gana.
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    })
    const byDay = new Map<string, string>()
    for (const log of logs) {
      byDay.set(fmt.format(log.createdAt), log.moodKey)
    }

    // Reconstruir array de N días terminando en hoy (ascendente).
    const history: Array<{ date: string; moodKey: string | null; emoji?: string; label?: string }> = []
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const date = fmt.format(d)
      const moodKey = byDay.get(date) ?? null
      if (moodKey && (MOOD_BY_KEY as any)[moodKey]) {
        const m = (MOOD_BY_KEY as any)[moodKey]
        history.push({ date, moodKey, emoji: m.emoji, label: m.label })
      } else {
        history.push({ date, moodKey: null })
      }
    }

    res.json({ tz, days, history })
  } catch (e) {
    logger.error({ err: e }, 'Error fetching mood history')
    res.status(500).json({ error: 'Failed to fetch mood history' })
  }
})

// v2.2.4 — preferencias de notificación (canvas 10 Claude Design).
// 3 tiers: critical (siempre llega) / digest (resumen diario) / off.
// Quiet hours configurables. Toggles por categoría.
router.get('/notification-preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })
    const prefs = await getPreferencesForUser(userId)
    res.json({ preferences: prefs })
  } catch (e) {
    logger.error({ err: e }, '[notification-preferences GET] error')
    res.status(500).json({ error: 'Failed to fetch preferences' })
  }
})

router.put('/notification-preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })
    const body = req.body ?? {}
    // Defensive: validar estructura mínima
    const current = await getPreferencesForUser(userId)
    const next = {
      quietHours: {
        start: typeof body.quietHours?.start === 'string' ? body.quietHours.start : current.quietHours.start,
        end:   typeof body.quietHours?.end   === 'string' ? body.quietHours.end   : current.quietHours.end,
      },
      digestEnabled: typeof body.digestEnabled === 'boolean' ? body.digestEnabled : current.digestEnabled,
      digestHour: typeof body.digestHour === 'string' ? body.digestHour : current.digestHour,
      categories: { ...current.categories, ...(body.categories ?? {}) },
    }
    const saved = await setPreferencesForUser(userId, next)
    res.json({ preferences: saved })
  } catch (e) {
    logger.error({ err: e }, '[notification-preferences PUT] error')
    res.status(500).json({ error: 'Failed to save preferences' })
  }
})

export default router
