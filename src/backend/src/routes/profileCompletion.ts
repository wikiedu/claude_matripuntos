// v1.6.1 — GET /api/profile/completion devuelve {percent, missing[]} para
// que el banner del invitado muestre porcentaje y lleve al campo missing
// más prioritario.

import { Router, Request, Response } from 'express'
import { requireAuth } from '../lib/requireAuth.js'
import { authenticateToken } from '../middleware/auth.js'
import { readBucket } from '../middleware/rateLimiter.js'
import prisma from '../lib/prisma.js'
import { parseJsonField } from '../lib/jsonField.js'

const router = Router()
router.use(authenticateToken)

const WEIGHTS = {
  avatar: 10,
  surname: 10,
  workMode: 15,
  weeklyWorkHours: 15,
  taskPreferencesLoves: 20,
  taskPreferencesDislikes: 20,
  profilePhotoUrl: 10,
}

router.get('/completion', readBucket, async (req: Request, res: Response) => {
  const userId = requireAuth(req).userId
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  })
  if (!user) return res.status(404).json({ error: 'No encontrado' })

  const profile = user.profile
  const lovesArr  = parseJsonField<string[]>(profile?.taskPreferencesLoves, [])
  const dislikesArr = parseJsonField<string[]>(profile?.taskPreferencesDislikes, [])

  let percent = 0
  const missing: string[] = []

  if ((user as any).avatarEmoji && (user as any).avatarColor) percent += WEIGHTS.avatar
  else missing.push('avatar')

  if (profile?.surname) percent += WEIGHTS.surname
  else missing.push('surname')

  if (profile?.workMode) percent += WEIGHTS.workMode
  else missing.push('workMode')

  if (profile?.weeklyWorkHours !== null && profile?.weeklyWorkHours !== undefined) percent += WEIGHTS.weeklyWorkHours
  else missing.push('weeklyWorkHours')

  if (Array.isArray(lovesArr) && lovesArr.length > 0) percent += WEIGHTS.taskPreferencesLoves
  else missing.push('taskPreferencesLoves')

  if (Array.isArray(dislikesArr) && dislikesArr.length > 0) percent += WEIGHTS.taskPreferencesDislikes
  else missing.push('taskPreferencesDislikes')

  if (profile?.profilePhotoUrl) percent += WEIGHTS.profilePhotoUrl
  else missing.push('profilePhotoUrl')

  res.json({ percent, missing })
})

export default router
