import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { UserProfileInput, CoupleProfileInput, OnboardingData } from '../types/v2.js'

const router = Router()
import prisma from '../lib/prisma.js'

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
  try {
    const userId = (req as any).user.id
    const { avatarEmoji, avatarColor, theme, currentMood, hasCompletedOnboarding } = req.body

    // Lazily create the UserProfile row if missing. Avoids the chicken-and-egg
    // problem where the seed / invite-flow needs to flip onboarding before any
    // profile exists.
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...(avatarEmoji !== undefined && { avatarEmoji }),
        ...(avatarColor !== undefined && { avatarColor }),
        ...(theme !== undefined && { theme }),
        ...(currentMood !== undefined && {
          currentMood,
          moodUpdatedAt: new Date(),
        }),
      },
      create: {
        userId,
        ...(avatarEmoji !== undefined && { avatarEmoji }),
        ...(avatarColor !== undefined && { avatarColor }),
        ...(theme !== undefined && { theme }),
        ...(currentMood !== undefined && {
          currentMood,
          moodUpdatedAt: new Date(),
        }),
      },
    })

    if (typeof hasCompletedOnboarding === 'boolean') {
      await prisma.user.update({
        where: { id: userId },
        data: { hasCompletedOnboarding },
      })
    }

    res.json({ message: 'Profile updated', profile })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router
