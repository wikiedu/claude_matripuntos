import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { UserProfileInput, CoupleProfileInput, OnboardingData } from '../types/v2.js'
import { MOOD_KEYS } from '../data/moodKeys.js'

const router = Router()
import prisma from '../lib/prisma.js'

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
    const userId = (req as any).user.id
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
    console.error('Error completing user profile:', error)
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
    const currentUserId = (req as any).user.id

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
      taskPreferencesLoves: JSON.parse(profile.taskPreferencesLoves),
      taskPreferencesDislikes: JSON.parse(profile.taskPreferencesDislikes),
      workSchedule: profile.workSchedule ? JSON.parse(profile.workSchedule) : null,
    }

    res.json(parsedProfile)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

/**
 * Complete couple profile
 * POST /api/profile/couple
 */
router.post('/couple', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
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
    console.error('Error completing couple profile:', error)
    res.status(500).json({ error: 'Failed to complete couple profile' })
  }
})

/**
 * Get couple profile
 * GET /api/profile/couple
 */
router.get('/couple', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id

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
      cohabitation: coupleProfile.cohabitation ? JSON.parse(coupleProfile.cohabitation) : null,
      externalServices: coupleProfile.externalServices ? JSON.parse(coupleProfile.externalServices) : null,
    }

    res.json(parsedProfile)
  } catch (error) {
    console.error('Error fetching couple profile:', error)
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
  const userId = (req as any).user.id
  const coupleId = (req as any).user.coupleId

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
    console.error('Error updating profile:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router
